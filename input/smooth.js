/**
 * Webcam pose filter: exponential smooth + last-known-good.
 * Sits between raw landmarks and assembleSample so every microgame
 * sees stable joints. Pointer / keyboard stand-ins stay crisp.
 *
 * Tunable constants (kids prefer stable over snappy-but-shaky):
 *   SMOOTH_RATE      — exponential follow rate (1/s). Higher = snappier.
 *   LKG_HOLD_MS      — serve last usable joint this long after a dropout.
 *   LKG_FADE_MS      — then fade confidence before dropping the joint.
 *   MIN_CONFIDENCE   — below this, treat the sample as missing (not 0,0).
 */

import { clamp01 } from "./joints.js";
import { MAX_POSES, POSE_IDS } from "./poses.js";

/** Exponential follow rate in 1/s. ~70ms time-constant; slap/stomp still land. */
export const SMOOTH_RATE = 14;

/** Hold last-known-good this many ms after a missing / low-confidence sample. */
export const LKG_HOLD_MS = 280;

/** After the hold, fade confidence over this many ms, then idle (drop). */
export const LKG_FADE_MS = 140;

/**
 * Same floor as landmarksToJoints. A sample below this is a dropout,
 * not a teleport to the origin.
 */
export const MIN_CONFIDENCE = 0.35;

/**
 * @typedef {import("./index.js").Joint} Joint
 */

/**
 * @typedef {object} SmoothOptions
 * @property {number} [rate]
 * @property {number} [lkgHoldMs]
 * @property {number} [fadeMs]
 * @property {number} [minConfidence]
 */

/**
 * Per-body, per-joint memory. apply() is index-aligned with webcam slots
 * (p1, p2) so two people in one frame stay independent.
 *
 * @param {SmoothOptions} [options]
 */
export function createPoseSmoother({
  rate = SMOOTH_RATE,
  lkgHoldMs = LKG_HOLD_MS,
  fadeMs = LKG_FADE_MS,
  minConfidence = MIN_CONFIDENCE,
} = {}) {
  const followRate = Number.isFinite(rate) && rate > 0 ? rate : SMOOTH_RATE;
  const holdMs = Number.isFinite(lkgHoldMs) && lkgHoldMs >= 0 ? lkgHoldMs : LKG_HOLD_MS;
  const fade = Number.isFinite(fadeMs) && fadeMs >= 0 ? fadeMs : LKG_FADE_MS;
  const floor = Number.isFinite(minConfidence) ? minConfidence : MIN_CONFIDENCE;

  /**
   * @type {Map<string, Map<string, { x: number, y: number, confidence: number, seenAt: number, at: number }>>}
   */
  const bodies = new Map();

  /**
   * @param {(Record<string, Joint> | null | undefined)[]} maps
   * @param {number} timestamp milliseconds
   * @returns {Record<string, Joint>[]}
   */
  function apply(maps = [], timestamp = 0) {
    const now = Number.isFinite(timestamp) ? timestamp : 0;
    /** @type {Record<string, Joint>[]} */
    const out = [];
    for (let i = 0; i < MAX_POSES; i += 1) {
      const incoming = maps[i] && typeof maps[i] === "object" ? maps[i] : {};
      out[i] = applyBody(POSE_IDS[i], incoming, now);
    }
    return out;
  }

  /**
   * @param {string} id
   * @param {Record<string, Joint>} joints
   * @param {number} now
   */
  function applyBody(id, joints, now) {
    let memory = bodies.get(id);
    if (!memory) {
      memory = new Map();
      bodies.set(id, memory);
    }

    const names = new Set([...Object.keys(joints), ...memory.keys()]);
    /** @type {Record<string, Joint>} */
    const out = {};

    for (const name of names) {
      const stepped = stepJoint(memory.get(name), joints[name], now);
      if (stepped.store) memory.set(name, stepped.store);
      else memory.delete(name);
      if (stepped.joint) out[name] = stepped.joint;
    }

    if (memory.size === 0) bodies.delete(id);
    return out;
  }

  /**
   * @param {{ x: number, y: number, confidence: number, seenAt: number, at: number } | undefined} prev
   * @param {Joint | undefined} sample
   * @param {number} now
   */
  function stepJoint(prev, sample, now) {
    if (usable(sample, floor)) {
      const dt = prev ? Math.max(0, (now - prev.at) / 1000) : 0;
      const alpha = prev ? 1 - Math.exp(-dt * followRate) : 1;
      const x = clamp01(prev ? prev.x + (sample.x - prev.x) * alpha : sample.x);
      const y = clamp01(prev ? prev.y + (sample.y - prev.y) * alpha : sample.y);
      const confidence = sample.confidence;
      const store = { x, y, confidence, seenAt: now, at: now };
      return { joint: { x, y, confidence }, store };
    }

    if (!prev) return { joint: null, store: null };

    const age = now - prev.seenAt;
    if (age <= holdMs) {
      return {
        joint: { x: prev.x, y: prev.y, confidence: prev.confidence },
        store: { ...prev, at: now },
      };
    }

    const fadeAge = age - holdMs;
    if (fadeAge < fade) {
      const confidence = prev.confidence * (1 - fadeAge / fade);
      return {
        joint: { x: prev.x, y: prev.y, confidence },
        store: { ...prev, at: now },
      };
    }

    return { joint: null, store: null };
  }

  function reset() {
    bodies.clear();
  }

  return {
    apply,
    reset,
    constants: { rate: followRate, lkgHoldMs: holdMs, fadeMs: fade, minConfidence: floor },
  };
}

/**
 * @param {Joint | null | undefined} joint
 * @param {number} floor
 */
function usable(joint, floor) {
  return Boolean(
    joint &&
      Number.isFinite(joint.x) &&
      Number.isFinite(joint.y) &&
      (joint.confidence ?? 1) >= floor,
  );
}
