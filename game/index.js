/**
 * Game state owner. One verb: hands (or the pointer) hit a floating orb.
 * A hit increments score. Letting the timer run out ends the attempt.
 */

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("../input/index.js").Joint} Joint
 */

export const HIT_RADIUS = 0.13;
export const TARGET_LIFETIME = 3.6;
export const STRIKER_NAMES = ["left_wrist", "right_wrist", "pointer"];

const FIELD = { x0: 0.46, x1: 0.88, y0: 0.28, y1: 0.76 };
const SPAWN_CLEARANCE = 0.22;
const DRIFT_MIN = 0.035;
const DRIFT_SPAN = 0.045;

/**
 * @typedef {object} Marker
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 */

/**
 * @typedef {object} Target
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 */

/**
 * @typedef {object} GameState
 * @property {number} elapsed Seconds since the current attempt started.
 * @property {number} ticks
 * @property {string} inputSource
 * @property {Marker} marker
 * @property {PoseSample | null} pose
 * @property {"waiting" | "playing" | "failed"} phase
 * @property {number} score
 * @property {Target} target
 * @property {number | null} timeLeft Seconds left on the current orb, or null while waiting.
 */

/**
 * @param {{ random?: () => number }} [options]
 * @returns {{
 *   tick: (dt: number, sample: PoseSample) => GameState,
 *   getState: () => GameState,
 *   reset: () => GameState,
 * }}
 */
export function createGame({ random = Math.random } = {}) {
  let nextTargetId = 1;

  /** @type {GameState} */
  const state = {
    elapsed: 0,
    ticks: 0,
    inputSource: "idle",
    marker: { x: 0.5, y: 0.5 },
    pose: null,
    phase: "waiting",
    score: 0,
    target: makeTarget(random, nextTargetId++, [], null),
    timeLeft: null,
  };

  /**
   * @param {number} dt Seconds since last tick.
   * @param {PoseSample} sample
   */
  function tick(dt, sample) {
    const step = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    state.elapsed += step;
    state.ticks += 1;
    state.pose = sample;
    state.inputSource = sample?.source ?? "idle";

    const strikers = listStrikers(sample?.joints);
    const aim = pickAim(sample?.joints, state.target) ?? idleAim(state.elapsed);
    const follow = 1 - Math.exp(-step * 8);
    state.marker.x += (aim.x - state.marker.x) * follow;
    state.marker.y += (aim.y - state.marker.y) * follow;

    if (state.phase === "failed") {
      return state;
    }

    driftTarget(state.target, step);

    if (hitsTarget(strikers, state.target)) {
      state.score += 1;
      state.phase = "playing";
      state.timeLeft = TARGET_LIFETIME;
      state.target = makeTarget(random, nextTargetId++, strikers, state.target);
      return state;
    }

    if (state.phase === "playing") {
      state.timeLeft = Math.max(0, (state.timeLeft ?? TARGET_LIFETIME) - step);
      if (state.timeLeft <= 0) {
        state.phase = "failed";
        state.timeLeft = 0;
      }
    }

    return state;
  }

  function getState() {
    return state;
  }

  function reset() {
    nextTargetId = 1;
    state.elapsed = 0;
    state.ticks = 0;
    state.phase = "waiting";
    state.score = 0;
    state.target = makeTarget(random, nextTargetId++, [], null);
    state.timeLeft = null;
    return state;
  }

  return { tick, getState, reset };
}

/**
 * @param {Record<string, Joint> | undefined} joints
 * @returns {Joint[]}
 */
export function listStrikers(joints) {
  if (!joints) return [];
  /** @type {Joint[]} */
  const strikers = [];
  for (const name of STRIKER_NAMES) {
    const joint = joints[name];
    if (usable(joint) && (joint.confidence ?? 1) >= 0.4) {
      strikers.push(joint);
    }
  }
  return strikers;
}

/**
 * @param {Joint[]} strikers
 * @param {Target} target
 */
export function hitsTarget(strikers, target) {
  return strikers.some((joint) => Math.hypot(joint.x - target.x, joint.y - target.y) <= HIT_RADIUS);
}

/**
 * @param {Record<string, Joint> | undefined} joints
 * @param {Target | null} target
 * @returns {Joint | null}
 */
function pickAim(joints, target) {
  const strikers = listStrikers(joints);
  if (strikers.length > 0) {
    return nearest(strikers, target ?? strikers[0]);
  }
  if (!joints) return null;
  const aim = joints.nose ?? null;
  if (!usable(aim)) return null;
  return aim;
}

/**
 * @param {Joint[]} points
 * @param {{ x: number, y: number }} dest
 */
function nearest(points, dest) {
  let best = points[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const dist = Math.hypot(point.x - dest.x, point.y - dest.y);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Idle path so the loop is visibly alive before any pointer input.
 * @param {number} elapsed
 * @returns {Marker}
 */
function idleAim(elapsed) {
  return {
    x: 0.5 + Math.cos(elapsed * 1.15) * 0.28,
    y: 0.52 + Math.sin(elapsed * 0.85) * 0.2,
  };
}

/**
 * @param {() => number} random
 * @param {number} id
 * @param {Joint[]} strikers
 * @param {Target | null} avoid
 * @returns {Target}
 */
function makeTarget(random, id, strikers, avoid) {
  let x = lerp(FIELD.x0, FIELD.x1, random());
  let y = lerp(FIELD.y0, FIELD.y1, random());

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clear = [...strikers, avoid].every(
      (point) => !point || Math.hypot(point.x - x, point.y - y) >= SPAWN_CLEARANCE,
    );
    if (clear) break;
    x = lerp(FIELD.x0, FIELD.x1, random());
    y = lerp(FIELD.y0, FIELD.y1, random());
  }

  const angle = random() * Math.PI * 2;
  const speed = DRIFT_MIN + random() * DRIFT_SPAN;
  return {
    id,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * @param {Target} target
 * @param {number} step
 */
function driftTarget(target, step) {
  target.x += target.vx * step;
  target.y += target.vy * step;

  if (target.x < FIELD.x0 || target.x > FIELD.x1) {
    target.vx *= -1;
    target.x = clamp(target.x, FIELD.x0, FIELD.x1);
  }
  if (target.y < FIELD.y0 || target.y > FIELD.y1) {
    target.vy *= -1;
    target.y = clamp(target.y, FIELD.y0, FIELD.y1);
  }
}

/**
 * @param {Joint | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
