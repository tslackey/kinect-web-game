/**
 * Game state owner. One verb: hands (or the pointer) hit a floating orb.
 * A session is start → rounds → game over. A hit increments score.
 * Letting the orb timer run out ends the round.
 * Either pose map can score — same orb, two bodies.
 */

import { posesFromSample } from "../input/poses.js";

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 */

export const HIT_RADIUS = 0.13;
export const TARGET_LIFETIME = 3.6;
export const LIFETIME_STEP = 0.4;
export const DRIFT_BOOST = 0.25;
export const ROUND_COUNT = 3;
export const ROUND_PAUSE = 1.75;
export const STRIKER_NAMES = ["left_wrist", "right_wrist", "pointer"];

const FIELD = { x0: 0.46, x1: 0.88, y0: 0.28, y1: 0.76 };
const SPAWN_CLEARANCE = 0.22;
const DRIFT_MIN = 0.035;
const DRIFT_SPAN = 0.045;

/**
 * @typedef {object} Marker
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 * @property {string} [id]
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
 * @property {number} elapsed Seconds since the current session started.
 * @property {number} ticks
 * @property {string} inputSource
 * @property {Marker} marker
 * @property {Marker[]} markers One aim per pose map when two people are live.
 * @property {PoseSample | null} pose
 * @property {"start" | "waiting" | "playing" | "between" | "over"} phase
 * @property {number} score
 * @property {number} round 1-based round index.
 * @property {number} rounds
 * @property {number} roundHits Hits landed in the current round.
 * @property {number} lifetime Seconds the current orb stays hittable.
 * @property {number} driftScale
 * @property {Target} target
 * @property {number | null} timeLeft Seconds left on the current orb, or null while waiting.
 * @property {number | null} holdLeft Seconds left in the between-round pause.
 * @property {Flash | null} flash Latest hit / miss / game-over cue for juice. Not a mechanic.
 */

/**
 * @typedef {object} Flash
 * @property {number} id
 * @property {"hit" | "miss" | "over"} kind
 * @property {number} x
 * @property {number} y
 * @property {number} score
 * @property {number} at Elapsed seconds when the cue fired.
 */

/**
 * @param {number} round
 */
export function lifetimeForRound(round) {
  return Math.max(1.6, TARGET_LIFETIME - Math.max(0, round - 1) * LIFETIME_STEP);
}

/**
 * @param {number} round
 */
export function driftScaleForRound(round) {
  return 1 + Math.max(0, round - 1) * DRIFT_BOOST;
}

/**
 * @param {{ random?: () => number, rounds?: number }} [options]
 * @returns {{
 *   tick: (dt: number, sample: PoseSample) => GameState,
 *   getState: () => GameState,
 *   start: () => GameState,
 *   reset: () => GameState,
 * }}
 */
export function createGame({ random = Math.random, rounds = ROUND_COUNT } = {}) {
  const sessionRounds = Math.max(1, Math.floor(rounds) || ROUND_COUNT);
  let nextTargetId = 1;
  let nextFlashId = 1;

  /** @type {GameState} */
  const state = {
    elapsed: 0,
    ticks: 0,
    inputSource: "idle",
    marker: { x: 0.5, y: 0.5 },
    markers: [],
    pose: null,
    phase: "start",
    score: 0,
    round: 1,
    rounds: sessionRounds,
    roundHits: 0,
    lifetime: TARGET_LIFETIME,
    driftScale: 1,
    target: makeTarget(random, nextTargetId++, [], null, 1),
    timeLeft: null,
    holdLeft: null,
    flash: null,
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

    const poses = posesFromSample(sample);
    const strikers = listSampleStrikers(sample);
    const follow = 1 - Math.exp(-step * 8);
    followMarkers(state, poses, follow);

    if (state.phase === "start" || state.phase === "over") {
      driftTarget(state.target, step);
      return state;
    }

    if (state.phase === "between") {
      state.holdLeft = Math.max(0, (state.holdLeft ?? ROUND_PAUSE) - step);
      if (state.holdLeft <= 0) {
        beginRound(state.round + 1);
      }
      return state;
    }

    driftTarget(state.target, step);

    if (hitsTarget(strikers, state.target)) {
      state.score += 1;
      state.roundHits += 1;
      state.phase = "playing";
      state.timeLeft = state.lifetime;
      emitFlash("hit", state.target.x, state.target.y);
      state.target = makeTarget(random, nextTargetId++, strikers, state.target, state.driftScale);
      return state;
    }

    if (state.phase === "playing") {
      state.timeLeft = Math.max(0, (state.timeLeft ?? state.lifetime) - step);
      if (state.timeLeft <= 0) {
        endRound();
      }
    }

    return state;
  }

  function getState() {
    return state;
  }

  function start() {
    if (state.phase !== "start" && state.phase !== "over") {
      return state;
    }
    nextTargetId = 1;
    nextFlashId = 1;
    state.elapsed = 0;
    state.score = 0;
    state.flash = null;
    beginRound(1);
    return state;
  }

  function reset() {
    nextTargetId = 1;
    nextFlashId = 1;
    state.elapsed = 0;
    state.ticks = 0;
    state.phase = "start";
    state.score = 0;
    state.round = 1;
    state.roundHits = 0;
    state.lifetime = lifetimeForRound(1);
    state.driftScale = driftScaleForRound(1);
    state.target = makeTarget(random, nextTargetId++, [], null, state.driftScale);
    state.timeLeft = null;
    state.holdLeft = null;
    state.flash = null;
    state.markers = [];
    return state;
  }

  /**
   * @param {number} round
   */
  function beginRound(round) {
    state.round = round;
    state.roundHits = 0;
    state.phase = "waiting";
    state.lifetime = lifetimeForRound(round);
    state.driftScale = driftScaleForRound(round);
    state.target = makeTarget(random, nextTargetId++, [], null, state.driftScale);
    state.timeLeft = null;
    state.holdLeft = null;
  }

  function endRound() {
    state.timeLeft = 0;
    if (state.round >= state.rounds) {
      state.phase = "over";
      state.holdLeft = null;
      emitFlash("over", state.target.x, state.target.y);
      return;
    }
    state.phase = "between";
    state.holdLeft = ROUND_PAUSE;
    emitFlash("miss", state.target.x, state.target.y);
  }

  /**
   * @param {Flash["kind"]} kind
   * @param {number} x
   * @param {number} y
   */
  function emitFlash(kind, x, y) {
    state.flash = {
      id: nextFlashId++,
      kind,
      x,
      y,
      score: state.score,
      at: state.elapsed,
    };
  }

  return { tick, getState, start, reset };
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
 * Hands from every pose map. Two people share the same orb.
 *
 * @param {PoseSample | null | undefined} sample
 * @returns {Joint[]}
 */
export function listSampleStrikers(sample) {
  return posesFromSample(sample).flatMap((pose) => listStrikers(pose.joints));
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
 * @param {GameState} state
 * @param {PoseMap[]} poses
 * @param {number} follow
 */
function followMarkers(state, poses, follow) {
  if (poses.length === 0) {
    const aim = idleAim(state.elapsed);
    state.marker.x += (aim.x - state.marker.x) * follow;
    state.marker.y += (aim.y - state.marker.y) * follow;
    state.markers = [];
    return;
  }

  /** @type {Marker[]} */
  const next = [];
  for (let i = 0; i < poses.length; i += 1) {
    const pose = poses[i];
    const prev = state.markers.find((marker) => marker.id === pose.id) ?? {
      id: pose.id,
      x: state.marker.x,
      y: state.marker.y,
    };
    const aim = pickAim(pose.joints, state.target) ?? idleAim(state.elapsed + i * 0.7);
    prev.x += (aim.x - prev.x) * follow;
    prev.y += (aim.y - prev.y) * follow;
    next.push(prev);
  }
  state.markers = next;
  const primary = nearest(next, state.target) ?? next[0];
  state.marker.x = primary.x;
  state.marker.y = primary.y;
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
 * @param {number} [driftScale]
 * @returns {Target}
 */
function makeTarget(random, id, strikers, avoid, driftScale = 1) {
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
  const speed = (DRIFT_MIN + random() * DRIFT_SPAN) * driftScale;
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
