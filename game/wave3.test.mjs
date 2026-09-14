import {
  BRUSH_STROKES,
  BRUSH_TEETH,
  CHEERS_DWELL,
  CHEERS_TOAST,
  COMB_HAIR,
  COMB_STROKES,
  DEFAULT_PACK,
  DIG_STROKES,
  DIG_TREASURE,
  FLAP_COUNT,
  FLAP_WINGS,
  HEAD_BALL,
  HOP_DWELL,
  HOP_FOOT,
  KNOCK_COUNT,
  KNOCK_DOOR,
  LAYOUT_COOP,
  LAYOUT_SPLIT,
  OPEN_UMBRELLA,
  PLAY_DURATION,
  SKIP_COUNT,
  SKIP_PERIOD,
  SKIP_ROPE,
  STAMP_PASSPORT,
  TUG_OF_WAR,
  UMBRELLA_DWELL,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
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

function twoBodies(p1Joints, p2Joints, source = "webcam") {
  return {
    source,
    poses: [
      { id: "p1", source, joints: p1Joints },
      { id: "p2", source, joints: p2Joints },
    ],
    timestamp: 0,
  };
}

function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  let t = 0;
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    t += 1 / 60;
    const pose = typeof sample === "function" ? sample(play, t) : sample;
    outcome = play.tick(1 / 60, pose);
  }
  return outcome;
}

const WAVE3 = [
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

for (const def of WAVE3) {
  assert(isMicrogameDef(def), `${def.id} must satisfy the microgame contract`);
  assert(def.duration === PLAY_DURATION, `${def.id} uses the 18s play window`);
  assert(def.prompt.split(/\s+/).length <= 2, `${def.id} prompt stays short`);
  assert(DEFAULT_PACK.some((item) => item.id === def.id), `${def.id} is in the session pack`);
  const expected = def.id === "cheers-toast" || def.id === "tug-of-war" ? LAYOUT_COOP : LAYOUT_SPLIT;
  assert(def.layout === expected, `${def.id} uses the concept layout`);
  const play = def.create({ random: () => 0.2, index: 1, duration: def.duration });
  play.start();
  assert(isPlayOutcome(play.tick(1 / 60, idle())), `${def.id} tick returns a contract outcome`);
  assert(play.getView().scene?.kind, `${def.id} exposes a scene`);
  const far = oneBody({ nose: { x: 0.5, y: 0.32, confidence: 1 } }, "mouse");
  const fresh = def.create({ random: () => 0.2, index: 1, duration: def.duration });
  fresh.start();
  assert(fresh.tick(1 / 60, far) === "playing", `${def.id}: a far pointer is not a wrong-gesture fail`);
}

const brush = BRUSH_TEETH.create({ random: () => 0.2, index: 1, duration: BRUSH_TEETH.duration });
brush.start();
assert(
  drainPlay(brush, 1.4, (_play, t) =>
    oneBody(
      {
        nose: { x: 0.5, y: 0.22, confidence: 1 },
        pointer: { x: 0.5 + 0.1 * Math.sin(t * 14), y: 0.3, confidence: 1 },
      },
      "mouse",
    ),
  ) === "win",
  "scrubbing near the mouth meets the brush quota",
);
assert(BRUSH_STROKES >= 3, "brush asks for several strokes");

const flap = FLAP_WINGS.create({ random: () => 0.2, index: 1, duration: FLAP_WINGS.duration });
flap.start();
assert(
  drainPlay(flap, 1.2, (_play, t) =>
    oneBody({ pointer: { x: 0.5, y: 0.22 + 0.22 * (0.5 + 0.5 * Math.sin(t * 12)), confidence: 1 } }, "mouse"),
  ) === "win",
  "flapping the pointer up and down meets the flap count",
);
assert(FLAP_COUNT >= 3, "flap asks for several wing beats");

const umbrella = OPEN_UMBRELLA.create({ random: () => 0.2, index: 1, duration: OPEN_UMBRELLA.duration });
umbrella.start();
assert(
  drainPlay(umbrella, UMBRELLA_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.12, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer high opens the umbrella",
);
const umbrellaHands = OPEN_UMBRELLA.create({ random: () => 0.2, index: 1, duration: OPEN_UMBRELLA.duration });
umbrellaHands.start();
assert(
  drainPlay(
    umbrellaHands,
    UMBRELLA_DWELL + 0.05,
    oneBody({
      nose: { x: 0.5, y: 0.28, confidence: 1 },
      left_wrist: { x: 0.32, y: 0.16, confidence: 1 },
      right_wrist: { x: 0.68, y: 0.16, confidence: 1 },
    }),
  ) === "win",
  "both wrists high and wide open the umbrella",
);

const stamp = STAMP_PASSPORT.create({ random: () => 0.2, index: 1, duration: STAMP_PASSPORT.duration });
stamp.start();
const pad = stamp.getView().scene.pad;
assert(stamp.tick(1 / 60, oneBody({ pointer: { x: pad.x, y: 0.18, confidence: 1 } }, "mouse")) === "playing", "a raised hand cocks the stamp");
assert(
  stamp.tick(1 / 60, oneBody({ pointer: { x: pad.x, y: pad.y, confidence: 1 } }, "mouse")) === "win",
  "driving the hand down onto the pad stamps",
);

const head = HEAD_BALL.create({ random: () => 0.2, index: 1, duration: HEAD_BALL.duration });
head.start();
const ball = head.getView().scene.ball;
assert(
  head.tick(1 / 60, oneBody({ nose: { x: ball.x, y: ball.y, confidence: 1 } })) === "win",
  "a nose on the falling ball heads it",
);
const headMiss = HEAD_BALL.create({ random: () => 0.2, index: 1, duration: HEAD_BALL.duration });
headMiss.start();
assert(drainPlay(headMiss, 5, idle()) === "fail", "a ball that hits the ground fails");

const hop = HOP_FOOT.create({ random: () => 0.2, index: 1, duration: HOP_FOOT.duration });
hop.start();
assert(
  drainPlay(hop, HOP_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.3, confidence: 1 } }, "mouse")) === "win",
  "pointer stork-pose hops",
);
const hopBody = HOP_FOOT.create({ random: () => 0.2, index: 1, duration: HOP_FOOT.duration });
hopBody.start();
assert(
  drainPlay(
    hopBody,
    HOP_DWELL + 0.05,
    oneBody({
      left_ankle: { x: 0.48, y: 0.88, confidence: 1 },
      right_ankle: { x: 0.52, y: 0.7, confidence: 1 },
    }),
  ) === "win",
  "one ankle raised holds a hop",
);

const comb = COMB_HAIR.create({ random: () => 0.2, index: 1, duration: COMB_HAIR.duration });
comb.start();
assert(
  drainPlay(comb, 1.2, (_play, t) =>
    oneBody(
      {
        nose: { x: 0.5, y: 0.22, confidence: 1 },
        pointer: { x: 0.5 + 0.12 * Math.sin(t * 12), y: 0.12, confidence: 1 },
      },
      "mouse",
    ),
  ) === "win",
  "stroking over the head combs",
);
assert(COMB_STROKES >= 3, "comb asks for several strokes");

const knock = KNOCK_DOOR.create({ random: () => 0.2, index: 1, duration: KNOCK_DOOR.duration });
knock.start();
const door = knock.getView().scene.door;
for (let n = 0; n < KNOCK_COUNT; n += 1) {
  knock.tick(1 / 60, oneBody({ pointer: { x: door.x, y: door.y, confidence: 1 } }, "mouse"));
  knock.tick(1 / 60, oneBody({ pointer: { x: 0.2, y: 0.2, confidence: 1 } }, "mouse"));
}
assert(knock.tick(0, idle()) === "win" || knock.getView().scene.knocks >= KNOCK_COUNT, "tapping the door quota opens it");
const knockWin = KNOCK_DOOR.create({ random: () => 0.2, index: 1, duration: KNOCK_DOOR.duration });
knockWin.start();
const knockDoor = knockWin.getView().scene.door;
let knockOut = "playing";
for (let n = 0; n < KNOCK_COUNT; n += 1) {
  knockOut = knockWin.tick(1 / 60, oneBody({ pointer: { x: knockDoor.x, y: knockDoor.y, confidence: 1 } }, "mouse"));
  if (n < KNOCK_COUNT - 1) {
    knockOut = knockWin.tick(1 / 60, oneBody({ pointer: { x: 0.15, y: 0.2, confidence: 1 } }, "mouse"));
  }
}
assert(knockOut === "win", "three knocks win");

const cheers = CHEERS_TOAST.create({ random: () => 0.2, index: 1, duration: CHEERS_TOAST.duration });
cheers.start();
assert(
  drainPlay(cheers, CHEERS_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.32, confidence: 1 } }, "mouse")) === "win",
  "solo pointer can toast in the clink zone",
);
const cheersDuo = CHEERS_TOAST.create({ random: () => 0.2, index: 1, duration: CHEERS_TOAST.duration });
cheersDuo.start();
assert(
  drainPlay(
    cheersDuo,
    CHEERS_DWELL + 0.05,
    twoBodies(
      { left_wrist: { x: 0.48, y: 0.3, confidence: 1 } },
      { right_wrist: { x: 0.52, y: 0.3, confidence: 1 } },
    ),
  ) === "win",
  "both bodies in the clink zone toast",
);
assert(CHEERS_TOAST.layout === LAYOUT_COOP, "cheers stays coop-center");

const tug = TUG_OF_WAR.create({ random: () => 0.2, index: 1, duration: TUG_OF_WAR.duration });
tug.start();
assert(
  drainPlay(tug, 0.8, (_play, t) =>
    oneBody({ pointer: { x: 0.5 + 0.2 * Math.sin(t * 6), y: 0.48, confidence: 1 } }, "mouse"),
  ) === "win",
  "solo pointer tug accumulates team pull",
);
const tugDuo = TUG_OF_WAR.create({ random: () => 0.2, index: 1, duration: TUG_OF_WAR.duration });
tugDuo.start();
assert(
  drainPlay(tugDuo, 0.8, (_play, t) =>
    twoBodies(
      { left_wrist: { x: 0.32 - 0.12 * t, y: 0.48, confidence: 1 } },
      { right_wrist: { x: 0.68 + 0.12 * t, y: 0.48, confidence: 1 } },
    ),
  ) === "win",
  "both sides pulling outward is a shared tug win",
);

const dig = DIG_TREASURE.create({ random: () => 0.2, index: 1, duration: DIG_TREASURE.duration });
dig.start();
const pile = dig.getView().scene.pile;
assert(
  drainPlay(dig, 1.2, (_play, t) =>
    oneBody({ pointer: { x: pile.x, y: pile.y + 0.08 * Math.sin(t * 12), confidence: 1 } }, "mouse"),
  ) === "win",
  "scooping the pile finds treasure",
);
assert(DIG_STROKES >= 3, "dig asks for several scoops");

const skip = SKIP_ROPE.create({ random: () => 0.2, index: 1, duration: SKIP_ROPE.duration });
skip.start();
assert(
  drainPlay(skip, SKIP_PERIOD * (SKIP_COUNT + 1.2), oneBody({ pointer: { x: 0.5, y: 0.18, confidence: 1 } }, "mouse")) ===
    "win",
  "jumping each swing skips rope",
);
const skipTrip = SKIP_ROPE.create({ random: () => 0.2, index: 1, duration: SKIP_ROPE.duration });
skipTrip.start();
assert(
  drainPlay(skipTrip, SKIP_PERIOD * 1.7, oneBody({ nose: { x: 0.5, y: 0.4, confidence: 1 } })) === "fail",
  "missing the first live swing trips",
);

const coop = createGame({ pack: [CHEERS_TOAST], games: 1, shuffle: false, playerMode: "2p", random: () => 0.2 });
coop.start();
let steps = Math.ceil(1.8 / (1 / 60)) + 2;
for (let i = 0; i < steps; i += 1) coop.tick(1 / 60, idle());
assert(coop.getState().layout === "coop", "2P cheers stays coop-center");
assert(coop.getState().scene?.lanes == null, "cheers does not mirror a second clink");

console.log("game/wave3.test.mjs passed");
