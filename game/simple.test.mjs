import {
  BAR_Y,
  BEAM_Y,
  CATCH_FRUIT,
  CLAP_CUE_AT,
  CLAP_NOW,
  DEFAULT_PACK,
  DUCK_BEAM,
  DUCK_CLEARANCE,
  HIGH_FIVE,
  JUMP_BAR,
  LEAN_AWAY,
  PLAY_DURATION,
  POSE_DWELL,
  ROLL_DOUGH,
  SCORE_GOAL,
  SHOOT_HOOPS,
  SQUASH_DWELL,
  SQUASH_IT,
  STRIKE_POSE,
  STRETCH_WIDE,
  WAVE_DWELL,
  WAVE_HELLO,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
  shufflePack,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle() {
  return { source: "idle", poses: [], timestamp: 0 };
}

function oneBody(joints, source = "webcam") {
  return { source, poses: [{ id: "p1", source, joints }], timestamp: 0 };
}

/**
 * @param {ReturnType<DUCK_BEAM.create>} play
 * @param {number} seconds
 * @param {object} sample
 */
function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    const pose = typeof sample === "function" ? sample(play) : sample;
    outcome = play.tick(1 / 60, pose);
  }
  return outcome;
}

const SIMPLE = [
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
  SHOOT_HOOPS,
  ROLL_DOUGH,
];

for (const def of SIMPLE) {
  assert(isMicrogameDef(def), `${def.id} must satisfy the microgame contract`);
  assert(def.duration === PLAY_DURATION, `${def.id} uses the 18s play window`);
  assert(def.prompt.split(/\s+/).length <= 2, `${def.id} prompt stays short`);
  assert(DEFAULT_PACK.some((item) => item.id === def.id), `${def.id} is in the session pack`);
  const play = def.create({ random: () => 0.2, index: 1, duration: def.duration });
  play.start();
  assert(isPlayOutcome(play.tick(1 / 60, idle())), `${def.id} tick returns a contract outcome`);
  assert(play.getView().scene?.kind, `${def.id} exposes a scene`);
  const far = oneBody({ nose: { x: 0.5, y: 0.32, confidence: 1 } }, "mouse");
  assert(play.tick(1 / 60, far) === "playing", `${def.id}: a far pointer is not a wrong-gesture fail`);
  const timed = def.create({ random: () => 0.8, index: 1, duration: def.duration });
  timed.start();
  assert(drainPlay(timed, PLAY_DURATION + 0.15, far) === "fail", `${def.id} fails only on timeout`);
}

const duck = DUCK_BEAM.create({ random: () => 0.2, index: 1, duration: DUCK_BEAM.duration });
duck.start();
assert(
  duck.tick(1 / 60, oneBody({ nose: { x: 0.5, y: BEAM_Y + DUCK_CLEARANCE + 0.04, confidence: 1 } })) === "win",
  "ducking the nose under the beam wins",
);
const duckPointer = DUCK_BEAM.create({ random: () => 0.2, index: 1, duration: DUCK_BEAM.duration });
duckPointer.start();
assert(
  duckPointer.tick(1 / 60, oneBody({ pointer: { x: 0.5, y: 0.72, confidence: 1 } }, "mouse")) === "win",
  "pointer can duck when the camera is off",
);

const jump = JUMP_BAR.create({ random: () => 0.2, index: 1, duration: JUMP_BAR.duration });
jump.start();
assert(
  jump.tick(1 / 60, oneBody({ left_hip: { x: 0.5, y: BAR_Y - 0.04, confidence: 1 } })) === "win",
  "a hip above the bar wins",
);
const jumpPointer = JUMP_BAR.create({ random: () => 0.2, index: 1, duration: JUMP_BAR.duration });
jumpPointer.start();
assert(
  jumpPointer.tick(1 / 60, oneBody({ pointer: { x: 0.5, y: 0.18, confidence: 1 } }, "keyboard")) === "win",
  "keyboard stand-in can jump the bar",
);

const pose = STRIKE_POSE.create({ random: () => 0.2, index: 1, duration: STRIKE_POSE.duration });
pose.start();
const left = pose.getView().scene.left;
const right = pose.getView().scene.right;
assert(
  drainPlay(pose, POSE_DWELL + 0.05, oneBody({ pointer: { x: left.x, y: left.y, confidence: 1 } }, "mouse")) ===
    "playing",
  "one anchor is not yet a pose",
);
assert(
  drainPlay(pose, POSE_DWELL + 0.05, oneBody({ pointer: { x: right.x, y: right.y, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can hold each pose anchor in turn",
);
const poseBoth = STRIKE_POSE.create({ random: () => 0.2, index: 1, duration: STRIKE_POSE.duration });
poseBoth.start();
assert(
  drainPlay(
    poseBoth,
    POSE_DWELL + 0.05,
    oneBody({
      left_wrist: { x: left.x, y: left.y, confidence: 1 },
      right_wrist: { x: right.x, y: right.y, confidence: 1 },
    }),
  ) === "win",
  "both wrists on the anchors wins",
);

const lean = LEAN_AWAY.create({ random: () => 0.2, index: 1, duration: LEAN_AWAY.duration });
lean.start();
const leanSide = lean.getView().scene.side;
const leanX = leanSide === "left" ? 0.2 : 0.8;
assert(
  lean.tick(1 / 60, oneBody({ nose: { x: leanX, y: 0.4, confidence: 1 } })) === "win",
  "torso bias toward the marked side wins",
);
const leanPointer = LEAN_AWAY.create({ random: () => 0.2, index: 1, duration: LEAN_AWAY.duration });
leanPointer.start();
const pointerSide = leanPointer.getView().scene.side === "left" ? 0.15 : 0.85;
assert(
  leanPointer.tick(1 / 60, oneBody({ pointer: { x: pointerSide, y: 0.5, confidence: 1 } }, "mouse")) === "win",
  "pointer can lean when the camera is off",
);

const clapEarly = CLAP_NOW.create({ random: () => 0.2, index: 1, duration: CLAP_NOW.duration });
clapEarly.start();
assert(
  clapEarly.tick(
    1 / 60,
    oneBody({
      left_wrist: { x: 0.48, y: 0.42, confidence: 1 },
      right_wrist: { x: 0.52, y: 0.42, confidence: 1 },
    }),
  ) === "playing",
  "a clap before the cue is not a fail and not a win",
);
const clap = CLAP_NOW.create({ random: () => 0.2, index: 1, duration: CLAP_NOW.duration });
clap.start();
drainPlay(clap, CLAP_CUE_AT + 0.05, idle());
assert(clap.getView().scene.cue === true, "the clap cue becomes live");
assert(
  clap.tick(
    1 / 60,
    oneBody({
      left_wrist: { x: 0.48, y: 0.42, confidence: 1 },
      right_wrist: { x: 0.52, y: 0.42, confidence: 1 },
    }),
  ) === "win",
  "wrist–wrist distance on cue wins",
);
const clapPointer = CLAP_NOW.create({ random: () => 0.2, index: 1, duration: CLAP_NOW.duration });
clapPointer.start();
drainPlay(clapPointer, CLAP_CUE_AT + 0.05, idle());
assert(
  clapPointer.tick(1 / 60, oneBody({ pointer: { x: 0.5, y: 0.42, confidence: 1 } }, "mouse")) === "win",
  "pointer can hit the clap mark on cue",
);

const stretch = STRETCH_WIDE.create({ random: () => 0.2, index: 1, duration: STRETCH_WIDE.duration });
stretch.start();
assert(
  stretch.tick(
    1 / 60,
    oneBody({
      left_wrist: { x: 0.12, y: 0.42, confidence: 1 },
      right_wrist: { x: 0.88, y: 0.42, confidence: 1 },
    }),
  ) === "win",
  "a wide wrist span wins",
);
const stretchPointer = STRETCH_WIDE.create({ random: () => 0.2, index: 1, duration: STRETCH_WIDE.duration });
stretchPointer.start();
const posts = stretchPointer.getView().scene;
assert(
  stretchPointer.tick(1 / 60, oneBody({ pointer: { x: posts.left.x, y: posts.left.y, confidence: 1 } }, "mouse")) ===
    "playing",
  "one stretch post is not enough",
);
assert(
  stretchPointer.tick(1 / 60, oneBody({ pointer: { x: posts.right.x, y: posts.right.y, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can tag both stretch posts",
);

const five = HIGH_FIVE.create({ random: () => 0.2, index: 1, duration: HIGH_FIVE.duration });
five.start();
const zone = five.getView().scene.zone;
assert(
  five.tick(1 / 60, oneBody({ right_wrist: { x: zone.x, y: zone.y, confidence: 1 } })) === "win",
  "a wrist in the high zone wins",
);
const fivePointer = HIGH_FIVE.create({ random: () => 0.2, index: 1, duration: HIGH_FIVE.duration });
fivePointer.start();
const fiveZone = fivePointer.getView().scene.zone;
assert(
  fivePointer.tick(1 / 60, oneBody({ pointer: { x: fiveZone.x, y: fiveZone.y, confidence: 1 } }, "mouse")) === "win",
  "pointer can high-five",
);

const fruit = CATCH_FRUIT.create({ random: () => 0.2, index: 1, duration: CATCH_FRUIT.duration });
fruit.start();
const drop = fruit.getView().scene.fruit;
assert(
  fruit.tick(1 / 60, oneBody({ left_wrist: { x: drop.x, y: drop.y, confidence: 1 } })) === "win",
  "a wrist on the fruit catches it",
);
const fruitMiss = CATCH_FRUIT.create({ random: () => 0.2, index: 1, duration: CATCH_FRUIT.duration });
fruitMiss.start();
const firstFruit = fruitMiss.getView().target.id;
assert(drainPlay(fruitMiss, 5, idle()) === "playing", "a fallen fruit respawns; that is not a fail");
assert(fruitMiss.getView().target.id !== firstFruit, "a new fruit should spawn after one drops");

const fruitPointer = CATCH_FRUIT.create({ random: () => 0.35, index: 1, duration: CATCH_FRUIT.duration });
fruitPointer.start();
const fruitMark = fruitPointer.getView().scene.fruit;
assert(
  fruitPointer.tick(1 / 60, oneBody({ pointer: { x: fruitMark.x, y: fruitMark.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard can catch fruit",
);

const wave = WAVE_HELLO.create({ random: () => 0.2, index: 1, duration: WAVE_HELLO.duration });
wave.start();
assert(
  drainPlay(
    wave,
    WAVE_DWELL + 0.05,
    oneBody({
      nose: { x: 0.5, y: 0.28, confidence: 1 },
      left_wrist: { x: 0.5, y: 0.16, confidence: 1 },
    }),
  ) === "win",
  "a wrist above the head for the dwell wins",
);
const wavePointer = WAVE_HELLO.create({ random: () => 0.2, index: 1, duration: WAVE_HELLO.duration });
wavePointer.start();
assert(
  drainPlay(wavePointer, WAVE_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.12, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can wave high",
);

const squash = SQUASH_IT.create({ random: () => 0.2, index: 1, duration: SQUASH_IT.duration });
squash.start();
const pad = squash.getView().scene.zone;
assert(
  drainPlay(
    squash,
    SQUASH_DWELL + 0.05,
    oneBody({
      left_wrist: { x: pad.x - 0.04, y: pad.y, confidence: 1 },
      right_wrist: { x: pad.x + 0.04, y: pad.y, confidence: 1 },
    }),
  ) === "win",
  "both wrists in the zone wins",
);
const squashPointer = SQUASH_IT.create({ random: () => 0.2, index: 1, duration: SQUASH_IT.duration });
squashPointer.start();
assert(
  drainPlay(
    squashPointer,
    SQUASH_DWELL + 0.05,
    oneBody({ pointer: { x: pad.x, y: pad.y, confidence: 1 } }, "mouse"),
  ) === "win",
  "pointer can squash when the camera is off",
);

const shuffled = shufflePack(DEFAULT_PACK, () => 0.95);
assert(shuffled.length === DEFAULT_PACK.length, "shuffle keeps every game");
assert(
  shuffled.some((def) => def.id === "duck-beam") && shuffled.some((def) => def.id === "water-plant"),
  "the shuffle still includes carry games and the simple sweep",
);

const mixed = createGame({ random: () => 0.85, games: 4 });
const ids = new Set();
// Peek the session by reading prompts after constructing — first game is whatever shuffle picked.
mixed.start();
ids.add(mixed.getState().prompt);
assert(DEFAULT_PACK.some((def) => def.prompt === mixed.getState().prompt), "a shuffled session still uses the pack");
assert(mixed.getState().games === 4, "the default session stays a short run, not every game");

console.log("game/simple.test.mjs passed");
