/**
 * Game state owner. A session is a short sequence of microgames:
 * prompt → one game on a short timer → win or fail → next.
 *
 * Today's orb-hit is the first playable game so the loop is real.
 * Either pose map on the sample can score — one webcam, up to two bodies.
 */

import { posesFromSample } from "../input/poses.js";
import { listStrikers } from "./hit.js";
import {
  GAME_COUNT,
  PROMPT_DURATION,
  RESULT_DURATION,
  isPlayOutcome,
  sequenceFromPack,
} from "./microgame.js";
import { ORB_HIT, driftOrb, driftScaleForGame, lifetimeForGame } from "./orb.js";

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 * @typedef {import("./microgame.js").MicrogameDef} MicrogameDef
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./orb.js").Target} Target
 */

export {
  GAME_COUNT,
  MICROGAME_OUTCOMES,
  PROMPT_DURATION,
  RESULT_DURATION,
  defineMicrogame,
  isMicrogameDef,
  isPlayOutcome,
  sequenceFromPack,
} from "./microgame.js";
export { HIT_RADIUS, STRIKER_NAMES, hitsTarget, listSampleStrikers, listStrikers } from "./hit.js";
export {
  DRIFT_BOOST,
  LIFETIME_STEP,
  ORB_HIT,
  TARGET_LIFETIME,
  driftOrb,
  driftScaleForGame,
  lifetimeForGame,
  makeTarget,
} from "./orb.js";

/**
 * @typedef {object} Marker
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 * @property {string} [id]
 */

/**
 * @typedef {object} GameState
 * @property {number} elapsed Seconds since the current session started.
 * @property {number} ticks
 * @property {string} inputSource
 * @property {Marker} marker
 * @property {Marker[]} markers One aim per pose map when two people are in frame.
 * @property {PoseSample | null} pose
 * @property {"start" | "prompt" | "playing" | "result" | "over"} phase
 * @property {number} score
 * @property {number} game 1-based microgame index.
 * @property {number} games
 * @property {string} prompt On-screen cue for the current game.
 * @property {string | null} gameId
 * @property {"win" | "fail" | null} result Outcome of the current game, if resolved.
 * @property {number} lifetime Seconds the current game stays playable.
 * @property {number} driftScale
 * @property {Target} target
 * @property {number | null} timeLeft Seconds left on the live game, or null during prompt.
 * @property {number | null} holdLeft Seconds left in the prompt or result beat.
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
 * @param {{
 *   random?: () => number,
 *   games?: number,
 *   pack?: MicrogameDef[],
 * }} [options]
 * @returns {{
 *   tick: (dt: number, sample: PoseSample) => GameState,
 *   getState: () => GameState,
 *   start: () => GameState,
 *   reset: () => GameState,
 * }}
 */
export function createGame({ random = Math.random, games = GAME_COUNT, pack } = {}) {
  const sequence = sequenceFromPack(pack, games, ORB_HIT);
  const sessionGames = sequence.length;
  let nextFlashId = 1;
  /** @type {MicrogamePlay | null} */
  let current = null;

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
    game: 1,
    games: sessionGames,
    prompt: ORB_HIT.prompt,
    gameId: null,
    result: null,
    lifetime: lifetimeForGame(1),
    driftScale: driftScaleForGame(1),
    target: {
      id: 0,
      x: 0.67,
      y: 0.52,
      vx: 0,
      vy: 0,
    },
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
    const follow = 1 - Math.exp(-step * 8);
    followMarkers(state, poses, follow);

    if (state.phase === "start" || state.phase === "over") {
      driftOrb(state.target, step);
      return state;
    }

    if (state.phase === "prompt") {
      driftOrb(state.target, step);
      state.holdLeft = Math.max(0, (state.holdLeft ?? PROMPT_DURATION) - step);
      if (state.holdLeft <= 0) {
        beginPlay();
      }
      return state;
    }

    if (state.phase === "result") {
      driftOrb(state.target, step);
      state.holdLeft = Math.max(0, (state.holdLeft ?? RESULT_DURATION) - step);
      if (state.holdLeft <= 0) {
        advanceAfterResult();
      }
      return state;
    }

    if (state.phase === "playing" && current) {
      const outcome = current.tick(step, sample);
      syncView();
      if (isPlayOutcome(outcome) && outcome !== "playing") {
        resolveGame(outcome);
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
    nextFlashId = 1;
    state.elapsed = 0;
    state.score = 0;
    state.flash = null;
    beginGame(1);
    return state;
  }

  function reset() {
    current = null;
    nextFlashId = 1;
    state.elapsed = 0;
    state.ticks = 0;
    state.phase = "start";
    state.score = 0;
    state.game = 1;
    state.prompt = ORB_HIT.prompt;
    state.gameId = null;
    state.result = null;
    state.lifetime = lifetimeForGame(1);
    state.driftScale = driftScaleForGame(1);
    state.timeLeft = null;
    state.holdLeft = null;
    state.flash = null;
    state.markers = [];
    return state;
  }

  /**
   * @param {number} index
   */
  function beginGame(index) {
    const def = sequence[index - 1] ?? ORB_HIT;
    current = def.create({ random, index, duration: def.duration });
    current.start();
    state.game = index;
    state.phase = "prompt";
    state.prompt = def.prompt;
    state.gameId = def.id;
    state.result = null;
    state.timeLeft = null;
    state.holdLeft = PROMPT_DURATION;
    syncView();
    state.timeLeft = null;
  }

  function beginPlay() {
    state.phase = "playing";
    state.holdLeft = null;
    syncView();
    if (state.timeLeft == null) {
      state.timeLeft = state.lifetime;
    }
  }

  /**
   * @param {"win" | "fail"} outcome
   */
  function resolveGame(outcome) {
    state.result = outcome;
    state.phase = "result";
    state.holdLeft = RESULT_DURATION;
    if (outcome === "win") {
      state.score += 1;
      emitFlash("hit", state.target.x, state.target.y);
      return;
    }
    emitFlash("miss", state.target.x, state.target.y);
  }

  function advanceAfterResult() {
    if (state.game >= state.games) {
      state.phase = "over";
      state.holdLeft = null;
      if (state.result === "fail") {
        emitFlash("over", state.target.x, state.target.y);
      }
      return;
    }
    beginGame(state.game + 1);
  }

  function syncView() {
    if (!current) return;
    const view = current.getView();
    if (view.target) state.target = view.target;
    if (view.lifetime != null) state.lifetime = view.lifetime;
    if (view.driftScale != null) state.driftScale = view.driftScale;
    if (state.phase === "playing" && view.timeLeft !== undefined) {
      state.timeLeft = view.timeLeft;
    }
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
 * @param {Joint | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
