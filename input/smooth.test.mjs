import {
  HIT_RADIUS,
  PICKUP_DWELL,
  WATER_PLANT,
  hitsTarget,
  listStrikers,
} from "../game/index.js";
import {
  LKG_FADE_MS,
  LKG_HOLD_MS,
  MIN_CONFIDENCE,
  SMOOTH_RATE,
  createPoseSmoother,
} from "./smooth.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function variance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

assert(SMOOTH_RATE > 8 && SMOOTH_RATE < 22, "smooth rate stays responsive, not mushy");
assert(LKG_HOLD_MS >= 150 && LKG_HOLD_MS <= 400, "LKG hold is the 150–400ms window");
assert(LKG_FADE_MS > 0 && LKG_FADE_MS <= 250, "fade is short after the hold");
assert(MIN_CONFIDENCE === 0.35, "min confidence matches landmarksToJoints");

const first = createPoseSmoother();
const born = first.apply([{ left_wrist: { x: 0.7, y: 0.22, confidence: 0.92 } }], 0);
assert(born[0].left_wrist.x === 0.7, "first sighting is the sample, not 0,0");
assert(born[0].left_wrist.y === 0.22, "first sighting keeps y");

const dropout = createPoseSmoother();
dropout.apply([{ left_wrist: { x: 0.4, y: 0.3, confidence: 0.9 } }], 0);
const blip = dropout.apply([{}], 16);
assert(blip[0].left_wrist, "a one-frame dropout still serves LKG");
assert(Math.abs(blip[0].left_wrist.x - 0.4) < 0.02, "LKG x does not yank");
assert(Math.abs(blip[0].left_wrist.y - 0.3) < 0.02, "LKG y does not yank");
assert(!(blip[0].left_wrist.x === 0 && blip[0].left_wrist.y === 0), "dropout must not snap to 0,0");

const low = createPoseSmoother();
low.apply([{ left_wrist: { x: 0.4, y: 0.3, confidence: 0.9 } }], 0);
const dim = low.apply([{ left_wrist: { x: 0.91, y: 0.88, confidence: 0.1 } }], 16);
assert(Math.abs(dim[0].left_wrist.x - 0.4) < 0.02, "low-confidence sample is a dropout, not a teleport");

const expire = createPoseSmoother({ lkgHoldMs: 100, fadeMs: 40 });
expire.apply([{ nose: { x: 0.41, y: 0.38, confidence: 0.95 } }], 0);
const held = expire.apply([{}], 80);
assert(held[0].nose, "LKG is still served inside the hold window");
const fading = expire.apply([{}], 120);
assert(fading[0].nose, "joint fades after the hold instead of popping off");
assert(fading[0].nose.confidence < 0.95, "fade lowers confidence");
const gone = expire.apply([{}], 160);
assert(!gone[0].nose, "joint idles after the fade");

const pair = createPoseSmoother();
pair.apply(
  [
    { left_wrist: { x: 0.2, y: 0.3, confidence: 1 } },
    { left_wrist: { x: 0.8, y: 0.31, confidence: 1 } },
  ],
  0,
);
const onlyP1 = pair.apply([{ left_wrist: { x: 0.2, y: 0.3, confidence: 1 } }, {}], 16);
assert(Math.abs(onlyP1[1].left_wrist.x - 0.8) < 0.02, "body 2 keeps its own LKG");
assert(Math.abs(onlyP1[0].left_wrist.x - 0.2) < 0.02, "body 1 stays independent");

const rawXs = [];
const outXs = [];
const jitter = createPoseSmoother();
let stamp = 0;
for (let i = 0; i < 28; i += 1) {
  const x = 0.5 + (i % 2 === 0 ? 0.05 : -0.05);
  rawXs.push(x);
  const maps = jitter.apply([{ left_wrist: { x, y: 0.5, confidence: 1 } }], stamp);
  outXs.push(maps[0].left_wrist.x);
  stamp += 33;
}
assert(variance(outXs) < variance(rawXs) * 0.55, "exponential smooth reduces wrist jitter");

const slap = createPoseSmoother();
slap.apply([{ right_wrist: { x: 0.3, y: 0.4, confidence: 1 } }], 0);
const mid = slap.apply([{ right_wrist: { x: 0.7, y: 0.4, confidence: 1 } }], 80);
assert(mid[0].right_wrist.x > 0.48, "a slap covers most of the travel within 80ms");
assert(mid[0].right_wrist.x < 0.7, "the slap is smoothed, not snapped");

const pot = { x: 0.24, y: 0.66 };
const hitFilter = createPoseSmoother();
hitFilter.apply([{ left_wrist: { x: pot.x, y: pot.y, confidence: 1 } }], 0);
const onPot = hitFilter.apply(
  [{ left_wrist: { x: pot.x + 0.01, y: pot.y, confidence: 1 } }],
  16,
);
assert(hitsTarget(listStrikers(onPot[0]), pot), "smoothed wrist still sits inside HIT_RADIUS");
assert(HIT_RADIUS === 0.13, "existing hit radius is unchanged");

const play = WATER_PLANT.create({ random: () => 0.8, index: 1, duration: WATER_PLANT.duration });
play.start();
const plantPot = play.getView().scene.pot;
const plantFilter = createPoseSmoother();
let plantAt = 0;
let outcome = "playing";
const dwellSteps = Math.ceil(PICKUP_DWELL / (1 / 60)) + 8;
for (let i = 0; i < dwellSteps; i += 1) {
  const jitterX = i % 2 === 0 ? 0.012 : -0.012;
  const raw = {
    left_wrist: { x: plantPot.x + jitterX, y: plantPot.y, confidence: 1 },
  };
  const maps = plantFilter.apply([raw], plantAt);
  plantAt += 16;
  outcome = play.tick(1 / 60, {
    source: "webcam",
    poses: [{ id: "p1", source: "webcam", joints: maps[0] }],
    timestamp: plantAt,
  });
}
assert(outcome === "playing", "pickup through smoothed jitter should not resolve the game");
assert(play.getView().scene.pot.held, "plant pickup dwell still completes after smoothing");

console.log("input/smooth.test.mjs passed");
