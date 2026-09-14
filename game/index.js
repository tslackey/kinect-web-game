/**
 * Game state owner. A session is a short sequence of microgames:
 * prompt → one game on a 15–20s timer → win, fail, or split → next.
 *
 * Default session shuffles a short run from the expanded pack (plant, pet,
 * fire, stomp, orb, the simple sweep, score / hoops / dough, tray /
 * mirror / potato, plus the second and third concept waves). 2P split
 * verbs give each body their own props and score; coop verbs stay
 * centered and a shared win credits both. Curtain wipes live on the
 * session, not on each game. Start and game-over share an on-canvas
 * hand-hold Play mark on the top-right playlist chrome; click Play stays
 * as the fallback. 1P uses the first body; 2P is two bodies in one
 * webcam frame.
 */

import { posesFromSample } from "../input/poses.js";
import { FOOT_STRIKER_NAMES, STRIKER_NAMES, listStrikers } from "./hit.js";
import { clipSampleForMode } from "./playlist.js";
import { createStartDwell, startHoldFor } from "./start-dwell.js";
import {
  LAYOUT_COOP,
  LAYOUT_SOLO,
  LAYOUT_SPLIT,
  LEFT_LANE,
  RIGHT_LANE,
  createSplitPlay,
  fieldInLane,
  liveLayoutFor,
} from "./layout.js";
import { CATCH_FRUIT } from "./fruit.js";
import { CLAP_NOW } from "./clap.js";
import { DUCK_BEAM } from "./duck.js";
import { HIGH_FIVE } from "./highfive.js";
import { JUMP_BAR } from "./jump.js";
import { SCORE_GOAL } from "./goal.js";
import { SHOOT_HOOPS } from "./hoops.js";
import { ROLL_DOUGH } from "./dough.js";
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
import { MIRROR_ME } from "./mirror.js";
import { HOT_POTATO } from "./potato.js";
import { BALANCE_TRAY } from "./tray.js";
import { WAVE_HELLO } from "./wave.js";
import { SWAT_FLY, driftFly } from "./fly.js";
import { RING_BELL } from "./bell.js";
import { FREEZE_DANCE } from "./freeze.js";
import { LIMBO_UNDER } from "./limbo.js";
import { BOW_KING } from "./bow.js";
import { COVER_EARS } from "./ears.js";
import { STIR_POT } from "./stir.js";
import { BLOCK_IT } from "./block.js";
import { PEEK_BINOCULARS } from "./peek.js";
import { PAT_DOG } from "./pat.js";
import { PULL_ROPE } from "./rope.js";
import { POP_BALLOONS } from "./balloons.js";
import { BRUSH_TEETH } from "./brush.js";
import { FLAP_WINGS } from "./flap.js";
import { OPEN_UMBRELLA } from "./umbrella.js";
import { STAMP_PASSPORT } from "./stamp.js";
import { HEAD_BALL } from "./headball.js";
import { HOP_FOOT } from "./hop.js";
import { COMB_HAIR } from "./comb.js";
import { KNOCK_DOOR } from "./knock.js";
import { CHEERS_TOAST } from "./cheers.js";
import { TUG_OF_WAR } from "./tug.js";
import { DIG_TREASURE } from "./dig.js";
import { SKIP_ROPE } from "./skip.js";

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 * @typedef {import("./microgame.js").MicrogameDef} MicrogameDef
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./orb.js").Target} Target
 * @typedef {import("./playlist.js").PlaylistSettings} PlaylistSettings
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
  CENTER_LANE,
  FULL_LANE,
  LAYOUT_COOP,
  LAYOUT_SOLO,
  LAYOUT_SPLIT,
  LEFT_LANE,
  RIGHT_LANE,
  assignLanePoses,
  combineSplitOutcomes,
  createSplitPlay,
  fieldInLane,
  liveLayoutFor,
  normalizeLayout,
  placeX,
  poseAnchorX,
  roundResultFor,
} from "./layout.js";
export {
  DEFAULT_CURTAIN_TIMINGS,
  REDUCED_CURTAIN_TIMINGS,
  createTransition,
  easeInOutCubic,
  interstitialDuration,
  placardScaleOf,
  timingsFor,
} from "./transition.js";
export {
  PLAYLIST_KEY,
  PLAYLIST_VERSION,
  RETIRED_GAMES,
  clipSampleForMode,
  defaultPlaylist,
  loadPlaylist,
  movePlaylistGame,
  normalizePlaylist,
  packFromPlaylist,
  playlistIsCustom,
  savePlaylist,
  sessionOptionsFromPlaylist,
  setPlayerMode,
  setPlaylistEnabled,
} from "./playlist.js";
export { DUCK_BEAM, DUCK_DURATION, BEAM_Y, DUCK_CLEARANCE } from "./duck.js";
export { JUMP_BAR, JUMP_DURATION, BAR_Y, JUMP_SPIKE } from "./jump.js";
export { STRIKE_POSE, POSE_DURATION, POSE_DWELL } from "./pose.js";
export { LEAN_AWAY, LEAN_DURATION, LEAN_EDGE } from "./lean.js";
export { CLAP_NOW, CLAP_DURATION, CLAP_CUE_AT, CLAP_SPAN } from "./clap.js";
export {
  GOAL_DRIVE,
  GOAL_DURATION,
  GOAL_FRICTION,
  GOAL_MOUTH,
  GOAL_SPEED,
  SCORE_GOAL,
  inGoal,
  makeGoalBall,
  rollBall,
} from "./goal.js";
export {
  HOOP,
  HOOPS_DRIVE,
  HOOPS_DURATION,
  HOOPS_GRAVITY,
  HOOPS_SPEED,
  SHOOT_HOOPS,
  inHoop,
  makeHoopBall,
  throughHoop,
} from "./hoops.js";
export {
  DOUGH_BREAK,
  DOUGH_DURATION,
  DOUGH_STROKE,
  DOUGH_STROKES,
  ROLL_DOUGH,
  layoutDough,
} from "./dough.js";
export { STRETCH_WIDE, STRETCH_DURATION, STRETCH_SPAN } from "./stretch.js";
export { HIGH_FIVE, HIGH_FIVE_DURATION } from "./highfive.js";
export { CATCH_FRUIT, FRUIT_DURATION, FRUIT_FALL, makeFruit } from "./fruit.js";
export { WAVE_HELLO, WAVE_DURATION, WAVE_DWELL } from "./wave.js";
export { FLY_DURATION, FLY_RADIUS, SWAT_FLY, driftFly } from "./fly.js";
export { BELL_DURATION, BELL_DWELL, RING_BELL } from "./bell.js";
export { FREEZE_CUE_AT, FREEZE_DURATION, FREEZE_DWELL, FREEZE_DANCE } from "./freeze.js";
export { LIMBO_CLEARANCE, LIMBO_DURATION, LIMBO_END_Y, LIMBO_START_Y, LIMBO_UNDER } from "./limbo.js";
export { BOW_DURATION, BOW_DWELL, BOW_KING } from "./bow.js";
export { COVER_EARS, EARS_DURATION, EARS_DWELL } from "./ears.js";
export { STIR_BREAK, STIR_DURATION, STIR_LOOPS, STIR_POT } from "./stir.js";
export { BLOCK_DURATION, BLOCK_IT, BLOCK_SPEED } from "./block.js";
export { PEEK_BINOCULARS, PEEK_DURATION, PEEK_DWELL } from "./peek.js";
export { PAT_DOG, PAT_DURATION, PAT_DWELL } from "./pat.js";
export { PULL_ROPE, ROPE_BREAK, ROPE_DURATION, ROPE_PULL } from "./rope.js";
export { BALLOON_DURATION, BALLOON_QUOTA, POP_BALLOONS, makeBalloon } from "./balloons.js";
export { BRUSH_DURATION, BRUSH_STROKES, BRUSH_TEETH } from "./brush.js";
export { FLAP_COUNT, FLAP_DURATION, FLAP_WINGS } from "./flap.js";
export { OPEN_UMBRELLA, UMBRELLA_DURATION, UMBRELLA_DWELL, UMBRELLA_SPAN } from "./umbrella.js";
export { STAMP_DURATION, STAMP_LIFT, STAMP_PASSPORT } from "./stamp.js";
export { HEAD_BALL, HEAD_DURATION, HEAD_FALL } from "./headball.js";
export { HOP_DWELL, HOP_DURATION, HOP_FOOT, HOP_LIFT } from "./hop.js";
export { COMB_DURATION, COMB_HAIR, COMB_STROKES } from "./comb.js";
export { KNOCK_COUNT, KNOCK_DOOR, KNOCK_DURATION } from "./knock.js";
export { CHEERS_DWELL, CHEERS_DURATION, CHEERS_TOAST } from "./cheers.js";
export { TUG_DURATION, TUG_OF_WAR, TUG_PULL } from "./tug.js";
export { DIG_DURATION, DIG_STROKES, DIG_TREASURE } from "./dig.js";
export { SKIP_COUNT, SKIP_DURATION, SKIP_PERIOD, SKIP_ROPE } from "./skip.js";
export { SQUASH_IT, SQUASH_DURATION, SQUASH_DWELL } from "./squash.js";
export {
  BALANCE_TRAY,
  TRAY_ARRIVE_DWELL,
  TRAY_DURATION,
  TRAY_PICKUP_DWELL,
  TRAY_TIP_GRACE,
  TRAY_TIP_Y,
  layoutTray,
} from "./tray.js";
export { MIRROR_DWELL, MIRROR_DURATION, MIRROR_ME } from "./mirror.js";
export {
  HOT_POTATO,
  POTATO_DURATION,
  POTATO_PASSES,
  POTATO_PICKUP_DWELL,
  layoutPotato,
} from "./potato.js";
export {
  FOOT_STRIKER_NAMES,
  HIT_RADIUS,
  STRIKER_NAMES,
  hitsTarget,
  listIdentifiedStrikers,
  listSampleStrikers,
  listStrikers,
} from "./hit.js";
export { OFFER_HOLD, createStickyCarry, overlapsCarry } from "./carry.js";
export {
  START_DWELL,
  START_HOLD,
  START_HOLD_RADIUS,
  createStartDwell,
  startHoldFor,
} from "./start-dwell.js";
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
  SCORE_GOAL,
  STRETCH_WIDE,
  HIGH_FIVE,
  CATCH_FRUIT,
  WAVE_HELLO,
  SQUASH_IT,
  BALANCE_TRAY,
  MIRROR_ME,
  HOT_POTATO,
  SHOOT_HOOPS,
  ROLL_DOUGH,
  SWAT_FLY,
  RING_BELL,
  FREEZE_DANCE,
  LIMBO_UNDER,
  BOW_KING,
  COVER_EARS,
  STIR_POT,
  BLOCK_IT,
  PEEK_BINOCULARS,
  PAT_DOG,
  PULL_ROPE,
  POP_BALLOONS,
  BRUSH_TEETH,
  FLAP_WINGS,
  OPEN_UMBRELLA,
  STAMP_PASSPORT,
  HEAD_BALL,
  HOP_FOOT,
  COMB_HAIR,
  KNOCK_DOOR,
  CHEERS_TOAST,
  TUG_OF_WAR,
  DIG_TREASURE,
  SKIP_ROPE,
];

const FOOT_GAMES = new Set(["stomp-bug", "score-goal", "hop-foot", "skip-rope"]);
const HEIGHT_GAMES = new Set(["duck-beam", "jump-bar", "limbo-under", "bow-king", "head-ball", "hop-foot", "skip-rope"]);
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
 * @property {number} score 1P score, or P1+P2 in 2P.
 * @property {{ p1: number, p2: number }} scores Per-player tallies. 1P only uses p1.
 * @property {number} game 1-based microgame index.
 * @property {number} games
 * @property {string} prompt On-screen cue for the current game.
 * @property {string | null} gameId
 * @property {"win" | "fail" | "split" | null} result Outcome of the current game, if resolved.
 * @property {import("./layout.js").PlayerResults | null} playerResults Per-body outcomes for the live game.
 * @property {"split" | "coop" | "solo" | null} layout Live layout. 1P is always solo.
 * @property {number} lifetime Seconds the current game stays playable.
 * @property {number} driftScale
 * @property {Target} target
 * @property {object | null} [scene] Live stage slice, or null for orb games.
 * @property {string | null} backgroundId Stage set id; swapped while the curtain is closed.
 * @property {import("./transition.js").CurtainView | null} transition Live curtain, or null outside the interstitial.
 * @property {number | null} timeLeft Seconds left on the live game, or null during prompt.
 * @property {number | null} holdLeft Seconds left in the prompt or result beat.
 * @property {Flash | null} flash Latest hit / miss / game-over cue for juice. Not a mechanic.
 * @property {import("./start-dwell.js").StartHold} startHold On-canvas dwell Play. Active on start / over only.
 * @property {"1p" | "2p"} playerMode 2P is two bodies in one webcam frame.
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
 *   playerMode?: "1p" | "2p",
 * }} [options]
 * @returns {{
 *   tick: (dt: number, sample: PoseSample) => GameState,
 *   getState: () => GameState,
 *   start: () => GameState,
 *   reset: () => GameState,
 *   configure: (next?: {
 *     pack?: MicrogameDef[],
 *     games?: number,
 *     shuffle?: boolean,
 *     playerMode?: "1p" | "2p",
 *   }) => GameState,
 * }}
 */
export function createGame({
  random = Math.random,
  games = GAME_COUNT,
  pack,
  reducedMotion = false,
  shuffle = true,
  playerMode = "2p",
} = {}) {
  let activePack = pack ?? DEFAULT_PACK;
  let gameCount = games;
  let shuffleOn = shuffle;
  let mode = playerMode === "1p" ? "1p" : "2p";
  let sequence = sequenceFromPack(
    activePack,
    gameCount,
    WATER_PLANT,
    shuffleOn ? random : undefined,
  );
  let sessionGames = sequence.length;
  let first = sequence[0] ?? WATER_PLANT;
  const transition = createTransition({ reducedMotion });
  const startDwell = createStartDwell();
  let nextFlashId = 1;
  /** @type {MicrogamePlay | null} */
  let current = null;
  /** @type {number | null} */
  let pendingIndex = null;
  let awardedP1 = false;
  let awardedP2 = false;

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
    scores: { p1: 0, p2: 0 },
    game: 1,
    games: sessionGames,
    prompt: first.prompt,
    gameId: null,
    result: null,
    playerResults: null,
    layout: liveLayoutFor(first.layout, mode),
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
    startHold: startHoldFor("start"),
    playerMode: mode,
  };

  /**
   * @param {number} dt Seconds since last tick.
   * @param {PoseSample} sample
   */
  function tick(dt, sample) {
    const step = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    const live = clipSampleForMode(sample, mode);
    state.elapsed += step;
    state.ticks += 1;
    state.pose = live;
    state.inputSource = live?.source ?? "idle";
    state.playerMode = mode;

    const poses = posesFromSample(live);
    const follow = 1 - Math.exp(-step * 8);
    followMarkers(state, poses, follow);

    if (state.phase === "start" || state.phase === "over") {
      const hold = startDwell.update(step, live, state.phase);
      state.startHold = hold;
      driftLiveTarget(state, step);
      if (hold.fired) {
        start();
      }
      return state;
    }

    state.startHold = startHoldFor(state.phase);

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
      const outcome = current.tick(step, live);
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
    startDwell.reset();
    state.startHold = startHoldFor("prompt");
    nextFlashId = 1;
    state.elapsed = 0;
    resetScores();
    state.flash = null;
    queueGame(1, { revealNow: true });
    return state;
  }

  function reset() {
    current = null;
    pendingIndex = null;
    nextFlashId = 1;
    startDwell.reset();
    transition.reset();
    awardedP1 = false;
    awardedP2 = false;
    state.elapsed = 0;
    state.ticks = 0;
    state.phase = "start";
    resetScores();
    state.game = 1;
    state.prompt = first.prompt;
    state.gameId = null;
    state.result = null;
    state.playerResults = null;
    state.layout = liveLayoutFor(first.layout, mode);
    state.lifetime = first.duration;
    state.driftScale = driftScaleForGame(1);
    state.scene = null;
    state.backgroundId = first.backgroundId ?? first.id;
    state.transition = null;
    state.timeLeft = null;
    state.holdLeft = null;
    state.flash = null;
    state.markers = [];
    state.startHold = startHoldFor("start");
    state.playerMode = mode;
    return state;
  }

  /**
   * Replace pack / mode on the start or over gate. Live play is a no-op.
   *
   * @param {{
   *   pack?: MicrogameDef[],
   *   games?: number,
   *   shuffle?: boolean,
   *   playerMode?: "1p" | "2p",
   * }} [next]
   */
  function configure(next = {}) {
    if (state.phase !== "start" && state.phase !== "over") {
      return state;
    }
    if (Array.isArray(next.pack)) activePack = next.pack;
    if (Number.isFinite(next.games)) gameCount = next.games;
    if (typeof next.shuffle === "boolean") shuffleOn = next.shuffle;
    if (next.playerMode === "1p" || next.playerMode === "2p") mode = next.playerMode;
    sequence = sequenceFromPack(
      activePack,
      gameCount,
      WATER_PLANT,
      shuffleOn ? random : undefined,
    );
    sessionGames = sequence.length;
    first = sequence[0] ?? WATER_PLANT;
    state.games = sessionGames;
    state.game = 1;
    state.prompt = first.prompt;
    state.lifetime = first.duration;
    state.driftScale = driftScaleForGame(1);
    state.backgroundId = first.backgroundId ?? first.id;
    state.playerMode = mode;
    state.layout = liveLayoutFor(first.layout, mode);
    state.playerResults = null;
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
    state.playerResults = null;
    state.layout = liveLayoutFor(def.layout, mode);
    awardedP1 = false;
    awardedP2 = false;
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
    current = createPlay(def, index);
    current.start();
    state.gameId = def.id;
    state.backgroundId = def.backgroundId ?? def.id;
    state.layout = liveLayoutFor(def.layout, mode);
    syncView();
    state.timeLeft = null;
    const view = transition.consumeSwap();
    state.transition = view;
  }

  /**
   * @param {MicrogameDef} def
   * @param {number} index
   */
  function createPlay(def, index) {
    const ctx = {
      random,
      index,
      duration: def.duration,
      playerMode: mode,
      layout: liveLayoutFor(def.layout, mode),
    };
    if (mode === "2p" && liveLayoutFor(def.layout, mode) === LAYOUT_SPLIT) {
      return createSplitPlay(def, ctx);
    }
    return def.create(ctx);
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
   * @param {"win" | "fail" | "split"} outcome
   */
  function resolveGame(outcome) {
    const results = playerResultsFor(outcome);
    state.playerResults = results;
    creditWins(results);
    state.result = outcome;
    state.phase = "result";
    state.holdLeft = RESULT_DURATION;
    if (outcome === "win") {
      if (!state.flash || state.flash.kind !== "hit") {
        emitFlash("hit", state.target.x, state.target.y);
      }
      return;
    }
    const missAt = failTarget(results) ?? state.target;
    emitFlash("miss", missAt.x, missAt.y);
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
    if (view.layout) state.layout = view.layout;
    else state.layout = liveLayoutFor(sequence[(pendingIndex ?? state.game) - 1]?.layout, mode);
    const results = view.playerResults ?? state.playerResults;
    if (results) state.playerResults = results;
    if (state.phase === "playing") {
      if (view.timeLeft !== undefined) state.timeLeft = view.timeLeft;
      if (results) creditWins(results);
    }
  }

  function resetScores() {
    state.scores = { p1: 0, p2: 0 };
    state.score = 0;
    awardedP1 = false;
    awardedP2 = false;
  }

  /**
   * @param {import("./layout.js").PlayerResults} results
   */
  function creditWins(results) {
    let scored = false;
    if (results.p1 === "win" && !awardedP1) {
      awardedP1 = true;
      state.scores.p1 += 1;
      scored = true;
      const at = laneTarget("p1");
      syncTotalScore();
      emitFlash("hit", at.x, at.y);
    }
    if (mode === "2p" && results.p2 === "win" && !awardedP2) {
      awardedP2 = true;
      state.scores.p2 += 1;
      scored = true;
      const at = laneTarget("p2");
      syncTotalScore();
      emitFlash("hit", at.x, at.y);
    }
    if (!scored) syncTotalScore();
  }

  function syncTotalScore() {
    state.score = mode === "1p" ? state.scores.p1 : state.scores.p1 + state.scores.p2;
  }

  /**
   * @param {"win" | "fail" | "split"} outcome
   * @returns {import("./layout.js").PlayerResults}
   */
  function playerResultsFor(outcome) {
    const viewed = current?.getView()?.playerResults;
    if (viewed) return viewed;
    if (mode === "1p" || state.layout === LAYOUT_SOLO) {
      return { p1: outcome === "win" ? "win" : "fail", p2: "idle" };
    }
    if (state.layout === LAYOUT_COOP) {
      const both = outcome === "win" ? "win" : "fail";
      return { p1: both, p2: both };
    }
    return {
      p1: outcome === "fail" ? "fail" : "win",
      p2: outcome === "win" ? "win" : outcome === "split" ? "fail" : "fail",
    };
  }

  /**
   * @param {import("./layout.js").PlayerResults} results
   */
  function failTarget(results) {
    if (results.p1 === "fail") return laneTarget("p1");
    if (results.p2 === "fail") return laneTarget("p2");
    return null;
  }

  /**
   * @param {"p1" | "p2"} player
   */
  function laneTarget(player) {
    const lane = state.scene?.lanes?.find((item) => item.player === player);
    const point =
      lane?.target ??
      lane?.pot ??
      lane?.bowl ??
      lane?.bucket ??
      lane?.bug ??
      lane?.ball ??
      lane?.plant ??
      lane?.pet ??
      lane?.fire ??
      lane?.fly ??
      lane?.bell ??
      lane?.dog ??
      lane?.shot ??
      lane?.handle ??
      lane?.pad ??
      lane?.door ??
      lane?.pile ??
      lane?.clink ??
      lane?.rope ??
      lane?.balloons?.[0];
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return point;
    return state.target;
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

  return { tick, getState, start, reset, configure };
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
  const lanes = state.scene?.lanes;
  if (Array.isArray(lanes) && lanes.length > 0) {
    for (const lane of lanes) {
      if (lane.result && lane.result !== "playing") continue;
      const target = lane.target;
      if (!target || !Number.isFinite(target.x)) continue;
      const box = fieldInLane(lane.player === "p2" ? RIGHT_LANE : LEFT_LANE, {
        x0: 0.12,
        x1: 0.88,
        y0: 0.28,
        y1: 0.88,
      });
      if (lane.kind === "stomp-bug" || state.scene?.kind === "stomp-bug") {
        driftBug(target, step, { ...box, y0: 0.68, y1: 0.88 });
      } else if (lane.kind === "swat-fly" || state.scene?.kind === "swat-fly") {
        driftFly(target, step, { ...box, y0: 0.22, y1: 0.72 });
      } else if (lane.kind === "orb-hit" || !lane.kind) {
        driftOrb(target, step, { ...box, y0: 0.28, y1: 0.76 });
      }
    }
    const live = lanes.find((lane) => lane.result === "playing" && lane.target) ?? lanes.find((lane) => lane.target);
    if (live?.target) state.target = live.target;
    return;
  }
  if (state.scene?.kind === "stomp-bug") {
    driftBug(state.target, step);
    return;
  }
  if (state.scene?.kind === "swat-fly") {
    driftFly(state.target, step);
    return;
  }
  if (state.scene?.kind === "catch-fruit" || state.scene?.kind === "pop-balloons" || state.scene?.kind === "head-ball") {
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
