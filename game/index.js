/**
 * Game state owner. A session is a short sequence of microgames:
 * prompt → one game on a 15–20s timer → win or fail → next.
 *
 * Default session shuffles a short run from the expanded pack (plant, pet,
 * fire, stomp, orb, plus the simple sweep). Either pose map on the sample
 * can score — one webcam, up to two bodies. Curtain wipes live on the
 * session, not on each game.
 */

import { posesFromSample } from "../input/poses.js";
import { FOOT_STRIKER_NAMES, STRIKER_NAMES, listStrikers } from "./hit.js";
import { CATCH_FRUIT } from "./fruit.js";
import { CLAP_NOW } from "./clap.js";
import { DUCK_BEAM } from "./duck.js";
import { HIGH_FIVE } from "./highfive.js";
import { JUMP_BAR } from "./jump.js";
import { KICK_BALL, driftBall } from "./kick.js";
import { LEAN_AWAY } from "./lean.js";
import {
  GAME_COUNT,
  RESULT_DURATION,
  isPlayOutcome,
  sequenceFromPack,
} from "./microgame.js";
import { ORB_HIT, driftOrb, driftScaleForGame } from "./orb.js";
import { WATER_PLANT } from "./plant.js";
import { FEED_PET } from "./pet.js";
import { DOUSE_FIRE } from "./fire.js";
import { STRIKE_POSE } from "./pose.js";
import { SQUASH_IT } from "./squash.js";
import { STOMP_BUG, driftBug } from "./bug.js";
import { STRETCH_WIDE } from "./stretch.js";
import { createTransition } from "./transition.js";
import { WAVE_HELLO } from "./wave.js";

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
  PLAY_DURATION,
  PROMPT_DURATION,
  RESULT_DURATION,
  defineMicrogame,
  isMicrogameDef,
  isPlayOutcome,
  sequenceFromPack,
  shufflePack,
} from "./microgame.js";
export {
  DEFAULT_CURTAIN_TIMINGS,
  REDUCED_CURTAIN_TIMINGS,
  createTransition,
  easeInOutCubic,
  interstitialDuration,
  timingsFor,
} from "./transition.js";
export { DUCK_BEAM, DUCK_DURATION, BEAM_Y, DUCK_CLEARANCE } from "./duck.js";
export { JUMP_BAR, JUMP_DURATION, BAR_Y, JUMP_SPIKE } from "./jump.js";
export { STRIKE_POSE, POSE_DURATION, POSE_DWELL } from "./pose.js";
export { LEAN_AWAY, LEAN_DURATION, LEAN_EDGE } from "./lean.js";
export { CLAP_NOW, CLAP_DURATION, CLAP_CUE_AT, CLAP_SPAN } from "./clap.js";
export { KICK_BALL, KICK_DURATION, KICK_DWELL, driftBall, makeBall } from "./kick.js";
export { STRETCH_WIDE, STRETCH_DURATION, STRETCH_SPAN } from "./stretch.js";
export { HIGH_FIVE, HIGH_FIVE_DURATION } from "./highfive.js";
export { CATCH_FRUIT, FRUIT_DURATION, FRUIT_FALL, makeFruit } from "./fruit.js";
export { WAVE_HELLO, WAVE_DURATION, WAVE_DWELL } from "./wave.js";
export { SQUASH_IT, SQUASH_DURATION, SQUASH_DWELL } from "./squash.js";
export {
  FOOT_STRIKER_NAMES,
  HIT_RADIUS,
  STRIKER_NAMES,
  hitsTarget,
  listIdentifiedStrikers,
  listSampleStrikers,
  listStrikers,
} from "./hit.js";
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
export {
  PICKUP_DWELL,
  PLANT_DURATION,
  POUR_DWELL,
  WATER_PLANT,
  layoutPlant,
} from "./plant.js";
export {
  FEED_DWELL,
  FEED_PET,
  PET_DURATION,
  PET_PICKUP_DWELL,
  layoutPet,
} from "./pet.js";
export {
  DOUSE_DWELL,
  DOUSE_FIRE,
  FIRE_DURATION,
  FIRE_PICKUP_DWELL,
  layoutFire,
} from "./fire.js";
export {
  BUG_DURATION,
  STOMP_BUG,
  STOMP_DRIVE,
  STOMP_DWELL,
  driftBug,
  makeBug,
} from "./bug.js";

/** Full pack. Session shuffles a short run so a play stays kid-length. */
export const DEFAULT_PACK = [
  WATER_PLANT,
  FEED_PET,
  DOUSE_FIRE,
  STOMP_BUG,
  ORB_HIT,
  DUCK_BEAM,
  JUMP_BAR,
  STRIKE_POSE,
  LEAN_AWAY,
  CLAP_NOW,
  KICK_BALL,
  STRETCH_WIDE,
  HIGH_FIVE,
  CATCH_FRUIT,
  WAVE_HELLO,
  SQUASH_IT,
];

const FOOT_GAMES = new Set(["stomp-bug", "kick-ball"]);
const HEIGHT_GAMES = new Set(["duck-beam", "jump-bar"]);
const LEAN_GAMES = new Set(["lean-away"]);

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
 * @property {object | null} [scene] Live stage slice, or null for orb games.
 * @property {string | null} backgroundId Stage set id; swapped while the curtain is closed.
 * @property {import("./transition.js").CurtainView | null} transition Live curtain, or null outside the interstitial.
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
 *   reducedMotion?: boolean,
 *   shuffle?: boolean,
 * }} [options]
 * @returns {{
 *   tick: (dt: number, sample: PoseSample) => GameState,
 *   getState: () => GameState,
 *   start: () => GameState,
 *   reset: () => GameState,
 * }}
 */
export function createGame({
  random = Math.random,
  games = GAME_COUNT,
  pack,
  reducedMotion = false,
  shuffle = true,
} = {}) {
  const sequence = sequenceFromPack(
    pack ?? DEFAULT_PACK,
    games,
    WATER_PLANT,
    shuffle ? random : undefined,
  );
  const sessionGames = sequence.length;
  const first = sequence[0] ?? WATER_PLANT;
  const transition = createTransition({ reducedMotion });
  let nextFlashId = 1;
  /** @type {MicrogamePlay | null} */
  let current = null;
  /** @type {number | null} */
  let pendingIndex = null;

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
    prompt: first.prompt,
    gameId: null,
    result: null,
    lifetime: first.duration,
    driftScale: driftScaleForGame(1),
    target: {
      id: 0,
      x: 0.67,
      y: 0.52,
      vx: 0,
      vy: 0,
    },
    scene: null,
    backgroundId: first.backgroundId ?? first.id,
    transition: null,
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
      driftLiveTarget(state, step);
      return state;
    }

    if (state.phase === "prompt") {
      const view = transition.tick(step);
      state.transition = view;
      state.holdLeft = view.remaining;
      if (view.readyToSwap) {
        revealGame();
      }
      driftLiveTarget(state, step);
      if (view.done) {
        beginPlay();
      }
      return state;
    }

    if (state.phase === "result") {
      driftLiveTarget(state, step);
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
    queueGame(1, { revealNow: true });
    return state;
  }

  function reset() {
    current = null;
    pendingIndex = null;
    nextFlashId = 1;
    transition.reset();
    state.elapsed = 0;
    state.ticks = 0;
    state.phase = "start";
    state.score = 0;
    state.game = 1;
    state.prompt = first.prompt;
    state.gameId = null;
    state.result = null;
    state.lifetime = first.duration;
    state.driftScale = driftScaleForGame(1);
    state.scene = null;
    state.backgroundId = first.backgroundId ?? first.id;
    state.transition = null;
    state.timeLeft = null;
    state.holdLeft = null;
    state.flash = null;
    state.markers = [];
    return state;
  }

  /**
   * Announce the next game and start the curtain. Scene swaps on the
   * covered beat unless this is session start (`revealNow`).
   *
   * @param {number} index
   * @param {{ revealNow?: boolean }} [options]
   */
  function queueGame(index, { revealNow = false } = {}) {
    const def = sequence[index - 1] ?? first;
    pendingIndex = index;
    state.game = index;
    state.phase = "prompt";
    state.prompt = def.title ?? def.prompt;
    state.result = null;
    state.timeLeft = null;
    state.lifetime = def.duration;
    state.driftScale = driftScaleForGame(index);
    const view = transition.toNext({
      title: def.title ?? def.prompt,
      backgroundId: def.backgroundId ?? def.id,
      subtitle: def.subtitle ?? "",
    });
    state.transition = view;
    state.holdLeft = view.remaining;
    if (revealNow || view.readyToSwap) {
      revealGame();
    }
  }

  function revealGame() {
    const index = pendingIndex ?? state.game;
    const def = sequence[index - 1] ?? first;
    current = def.create({ random, index, duration: def.duration });
    current.start();
    state.gameId = def.id;
    state.backgroundId = def.backgroundId ?? def.id;
    syncView();
    state.timeLeft = null;
    const view = transition.consumeSwap();
    state.transition = view;
  }

  function beginPlay() {
    if (!current) revealGame();
    state.phase = "playing";
    state.holdLeft = null;
    state.transition = null;
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
    queueGame(state.game + 1, { revealNow: false });
  }

  function syncView() {
    if (!current) return;
    const view = current.getView();
    if (view.target) state.target = view.target;
    if (view.lifetime != null) state.lifetime = view.lifetime;
    if (view.driftScale != null) state.driftScale = view.driftScale;
    state.scene = view.scene ?? null;
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
function pickAim(joints, target, gameId) {
  const names = strikerNamesFor(gameId);
  const strikers = listStrikers(joints, names);
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
    const aim = pickAim(pose.joints, state.target, state.gameId) ?? idleAim(state.elapsed + i * 0.7);
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
 * @param {GameState} state
 * @param {number} step
 */
function driftLiveTarget(state, step) {
  if (state.scene?.kind === "stomp-bug") {
    driftBug(state.target, step);
    return;
  }
  if (state.scene?.kind === "kick-ball") {
    driftBall(state.target, step);
    return;
  }
  if (state.scene?.kind === "catch-fruit") {
    return;
  }
  if (state.scene && state.scene.kind !== undefined && state.scene.kind !== "orb-hit") {
    return;
  }
  driftOrb(state.target, step);
}

/**
 * @param {string | null | undefined} gameId
 */
function strikerNamesFor(gameId) {
  if (gameId && FOOT_GAMES.has(gameId)) return FOOT_STRIKER_NAMES;
  if (gameId && HEIGHT_GAMES.has(gameId)) return ["left_hip", "right_hip", "nose", "pointer"];
  if (gameId && LEAN_GAMES.has(gameId)) return ["nose", "left_shoulder", "right_shoulder", "pointer"];
  return STRIKER_NAMES;
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
