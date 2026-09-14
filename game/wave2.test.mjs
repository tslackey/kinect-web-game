import {
  BALLOON_QUOTA,
  BELL_DWELL,
  BLOCK_IT,
  BOW_DWELL,
  BOW_KING,
  COVER_EARS,
  DEFAULT_PACK,
  EARS_DWELL,
  FREEZE_CUE_AT,
  FREEZE_DANCE,
  FREEZE_DWELL,
  FLY_RADIUS,
  LAYOUT_SPLIT,
  LEFT_LANE,
  LIMBO_UNDER,
  PAT_DOG,
  PAT_DWELL,
  PEEK_BINOCULARS,
  PEEK_DWELL,
  PLAY_DURATION,
  POP_BALLOONS,
  PULL_ROPE,
  RING_BELL,
  RIGHT_LANE,
  ROPE_PULL,
  STIR_LOOPS,
  STIR_POT,
  SWAT_FLY,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
  placeX,
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

const WAVE2 = [
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
];

for (const def of WAVE2) {
  assert(isMicrogameDef(def), `${def.id} must satisfy the microgame contract`);
  assert(def.duration === PLAY_DURATION, `${def.id} uses the 18s play window`);
  assert(def.prompt.split(/\s+/).length <= 2, `${def.id} prompt stays short`);
  assert(def.layout === LAYOUT_SPLIT, `${def.id} is a split verb`);
  assert(DEFAULT_PACK.some((item) => item.id === def.id), `${def.id} is in the session pack`);
  const play = def.create({ random: () => 0.2, index: 1, duration: def.duration });
  play.start();
  assert(isPlayOutcome(play.tick(1 / 60, idle())), `${def.id} tick returns a contract outcome`);
  assert(play.getView().scene?.kind, `${def.id} exposes a scene`);
  const far = oneBody({ nose: { x: 0.5, y: 0.32, confidence: 1 } }, "mouse");
  const fresh = def.create({ random: () => 0.2, index: 1, duration: def.duration });
  fresh.start();
  assert(fresh.tick(1 / 60, far) === "playing", `${def.id}: a far pointer is not a wrong-gesture fail`);
}

const fly = SWAT_FLY.create({ random: () => 0.2, index: 1, duration: SWAT_FLY.duration });
fly.start();
const flyMark = fly.getView().scene.fly;
assert(
  fly.tick(1 / 60, oneBody({ left_wrist: { x: flyMark.x, y: flyMark.y, confidence: 1 } })) === "win",
  "a wrist on the fly swats it",
);
const flyPointer = SWAT_FLY.create({ random: () => 0.35, index: 1, duration: SWAT_FLY.duration });
flyPointer.start();
const flySpot = flyPointer.getView().scene.fly;
assert(
  flyPointer.tick(1 / 60, oneBody({ pointer: { x: flySpot.x, y: flySpot.y, confidence: 1 } }, "mouse")) === "win",
  "pointer can swat when the camera is off",
);
assert(FLY_RADIUS < 0.13, "the fly is a smaller slap target than the orb");

const leftFly = SWAT_FLY.create({ random: () => 0.2, index: 1, duration: SWAT_FLY.duration, lane: LEFT_LANE });
leftFly.start();
const rightFly = SWAT_FLY.create({ random: () => 0.2, index: 1, duration: SWAT_FLY.duration, lane: RIGHT_LANE });
rightFly.start();
assert(leftFly.getView().scene.fly.x < 0.5, "P1 fly sits in the left lane");
assert(rightFly.getView().scene.fly.x > 0.5, "P2 fly sits in the right lane");

const bell = RING_BELL.create({ random: () => 0.2, index: 1, duration: RING_BELL.duration });
bell.start();
const bellMark = bell.getView().scene.bell;
assert(
  drainPlay(bell, BELL_DWELL + 0.05, oneBody({ right_wrist: { x: bellMark.x, y: bellMark.y, confidence: 1 } })) ===
    "win",
  "a wrist in the hanging bell wins",
);

const freezeWin = FREEZE_DANCE.create({ random: () => 0.2, index: 1, duration: FREEZE_DANCE.duration });
freezeWin.start();
assert(
  drainPlay(freezeWin, FREEZE_CUE_AT + 0.05, (_play, t) =>
    oneBody({
      left_wrist: { x: 0.3 + 0.2 * Math.sin(t * 14), y: 0.4, confidence: 1 },
      right_wrist: { x: 0.7 + 0.2 * Math.cos(t * 14), y: 0.42, confidence: 1 },
    }),
  ) === "playing",
  "dancing through the cue is not yet a freeze",
);
assert(
  drainPlay(
    freezeWin,
    FREEZE_DWELL + 0.25,
    oneBody({
      left_wrist: { x: 0.4, y: 0.4, confidence: 1 },
      right_wrist: { x: 0.6, y: 0.42, confidence: 1 },
    }),
  ) === "win",
  "stillness after dancing wins",
);

const freezeNever = FREEZE_DANCE.create({ random: () => 0.2, index: 1, duration: FREEZE_DANCE.duration });
freezeNever.start();
assert(
  drainPlay(freezeNever, FREEZE_CUE_AT + 0.05, oneBody({ nose: { x: 0.5, y: 0.3, confidence: 1 } })) === "fail",
  "never moving in the windup fails at the freeze cue",
);

const freezeWiggle = FREEZE_DANCE.create({ random: () => 0.2, index: 1, duration: FREEZE_DANCE.duration });
freezeWiggle.start();
drainPlay(freezeWiggle, FREEZE_CUE_AT + 0.05, (_play, t) =>
  oneBody({ pointer: { x: 0.4 + 0.2 * Math.sin(t * 16), y: 0.4, confidence: 1 } }, "mouse"),
);
assert(
  drainPlay(
    freezeWiggle,
    0.3,
    (_play, t) => oneBody({ pointer: { x: 0.4 + 0.2 * Math.sin(t * 16), y: 0.4, confidence: 1 } }, "mouse"),
  ) === "fail",
  "keeping the pointer moving after Freeze! fails",
);

const limbo = LIMBO_UNDER.create({ random: () => 0.2, index: 1, duration: LIMBO_UNDER.duration });
limbo.start();
assert(
  drainPlay(limbo, 2.7, oneBody({ pointer: { x: 0.5, y: 0.72, confidence: 1 } }, "mouse")) === "win",
  "pointer ducking under the descending bar wins",
);
const limboHit = LIMBO_UNDER.create({ random: () => 0.2, index: 1, duration: LIMBO_UNDER.duration });
limboHit.start();
assert(
  drainPlay(limboHit, 2.2, oneBody({ nose: { x: 0.5, y: 0.26, confidence: 1 } })) === "fail",
  "a standing head hits the descending bar",
);

const bow = BOW_KING.create({ random: () => 0.2, index: 1, duration: BOW_KING.duration });
bow.start();
assert(
  drainPlay(bow, BOW_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.7, confidence: 1 } }, "mouse")) === "win",
  "pointer moving down bows",
);
const bowBody = BOW_KING.create({ random: () => 0.2, index: 1, duration: BOW_KING.duration });
bowBody.start();
assert(
  drainPlay(
    bowBody,
    BOW_DWELL + 0.05,
    oneBody({
      nose: { x: 0.5, y: 0.58, confidence: 1 },
      left_hip: { x: 0.46, y: 0.6, confidence: 1 },
      right_hip: { x: 0.54, y: 0.6, confidence: 1 },
    }),
  ) === "win",
  "a torso fold wins the bow",
);

const ears = COVER_EARS.create({ random: () => 0.2, index: 1, duration: COVER_EARS.duration });
ears.start();
assert(
  drainPlay(
    ears,
    EARS_DWELL + 0.05,
    oneBody({
      nose: { x: 0.5, y: 0.22, confidence: 1 },
      left_wrist: { x: 0.4, y: 0.24, confidence: 1 },
      right_wrist: { x: 0.6, y: 0.24, confidence: 1 },
    }),
  ) === "win",
  "both wrists at the ears wins",
);
const earsPointer = COVER_EARS.create({ random: () => 0.2, index: 1, duration: COVER_EARS.duration });
earsPointer.start();
assert(
  drainPlay(earsPointer, EARS_DWELL + 0.05, oneBody({ pointer: { x: 0.5, y: 0.22, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can cover ears when the camera is off",
);

const stir = STIR_POT.create({ random: () => 0.2, index: 1, duration: STIR_POT.duration });
stir.start();
const pot = stir.getView().scene.pot;
assert(
  drainPlay(stir, 1.8, (_play, t) =>
    oneBody(
      {
        pointer: {
          x: pot.x + 0.08 * Math.cos(t * 10),
          y: pot.y + 0.08 * Math.sin(t * 10),
          confidence: 1,
        },
      },
      "mouse",
    ),
  ) === "win",
  "circling the pot stirs enough loops",
);
assert(STIR_LOOPS >= 2, "stir asks for more than one loop");
const stirLeave = STIR_POT.create({ random: () => 0.2, index: 1, duration: STIR_POT.duration });
stirLeave.start();
const leavePot = stirLeave.getView().scene.pot;
drainPlay(stirLeave, 0.2, oneBody({ pointer: { x: leavePot.x, y: leavePot.y, confidence: 1 } }, "mouse"));
assert(
  drainPlay(stirLeave, 1.2, oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse")) === "fail",
  "leaving the pot after stirring starts fails",
);

const block = BLOCK_IT.create({ random: () => 0.2, index: 1, duration: BLOCK_IT.duration });
block.start();
const shield = block.getView().scene.shield;
assert(
  drainPlay(
    block,
    2,
    oneBody({
      left_wrist: { x: shield.x - 0.04, y: shield.y, confidence: 1 },
      right_wrist: { x: shield.x + 0.04, y: shield.y, confidence: 1 },
    }),
  ) === "win",
  "both wrists in the shield zone block the shot",
);
const blockMiss = BLOCK_IT.create({ random: () => 0.2, index: 1, duration: BLOCK_IT.duration });
blockMiss.start();
assert(
  drainPlay(blockMiss, 2.2, oneBody({ nose: { x: 0.5, y: 0.3, confidence: 1 }, left_wrist: { x: 0.05, y: 0.9, confidence: 1 } })) ===
    "fail",
  "an unblocked shot hitting the body fails",
);

const peek = PEEK_BINOCULARS.create({ random: () => 0.2, index: 1, duration: PEEK_BINOCULARS.duration });
peek.start();
assert(
  drainPlay(
    peek,
    PEEK_DWELL + 0.05,
    oneBody({
      nose: { x: 0.5, y: 0.22, confidence: 1 },
      left_wrist: { x: 0.45, y: 0.2, confidence: 1 },
      right_wrist: { x: 0.55, y: 0.2, confidence: 1 },
    }),
  ) === "win",
  "both wrists at the eyes peeks",
);

const pat = PAT_DOG.create({ random: () => 0.2, index: 1, duration: PAT_DOG.duration });
pat.start();
const dog = pat.getView().scene.dog;
assert(
  drainPlay(pat, PAT_DWELL + 0.05, oneBody({ left_wrist: { x: dog.x, y: dog.y, confidence: 1 } })) === "win",
  "a reach-down wrist pat wins",
);
assert(dog.y > 0.7, "the dog sits in the lower field");
assert(placeX(LEFT_LANE, 0.42) < 0.5 && placeX(RIGHT_LANE, 0.42) > 0.5, "pat props remap into split lanes");

const rope = PULL_ROPE.create({ random: () => 0.2, index: 1, duration: PULL_ROPE.duration });
rope.start();
const handle = rope.getView().scene.handle;
assert(
  drainPlay(rope, 0.15, oneBody({
    left_wrist: { x: handle.x - 0.03, y: handle.y, confidence: 1 },
    right_wrist: { x: handle.x + 0.03, y: handle.y, confidence: 1 },
  })) === "playing",
  "grabbing the rope is not yet a pull",
);
assert(
  drainPlay(rope, 0.25, (_play, t) => {
    const y = handle.y + Math.min(ROPE_PULL + 0.06, t * 0.9);
    return oneBody({
      left_wrist: { x: handle.x - 0.03, y, confidence: 1 },
      right_wrist: { x: handle.x + 0.03, y, confidence: 1 },
    });
  }) === "win",
  "both hands pulling down wins",
);
const ropePointer = PULL_ROPE.create({ random: () => 0.2, index: 1, duration: PULL_ROPE.duration });
ropePointer.start();
const ropeHandle = ropePointer.getView().scene.handle;
drainPlay(ropePointer, 0.1, oneBody({ pointer: { x: ropeHandle.x, y: ropeHandle.y, confidence: 1 } }, "mouse"));
assert(
  drainPlay(ropePointer, 0.3, (_play, t) =>
    oneBody({ pointer: { x: ropeHandle.x, y: ropeHandle.y + Math.min(ROPE_PULL + 0.06, t * 0.9), confidence: 1 } }, "mouse"),
  ) === "win",
  "pointer can pull the rope",
);

const balloons = POP_BALLOONS.create({ random: () => 0.2, index: 1, duration: POP_BALLOONS.duration });
balloons.start();
assert((balloons.getView().scene.balloons?.length ?? 0) >= 1, "balloons are in the air");
for (let n = 0; n < BALLOON_QUOTA + 2; n += 1) {
  const marks = balloons.getView().scene.balloons;
  if (!marks?.length) break;
  balloons.tick(1 / 60, oneBody({ left_wrist: { x: marks[0].x, y: marks[0].y, confidence: 1 } }));
}
assert(balloons.getView().scene.popped >= BALLOON_QUOTA || balloons.tick(0, idle()) === "win", "popping the quota wins");

const timed = SWAT_FLY.create({ random: () => 0.8, index: 1, duration: SWAT_FLY.duration });
timed.start();
assert(drainPlay(timed, PLAY_DURATION + 0.15, oneBody({ nose: { x: 0.05, y: 0.05, confidence: 1 } })) === "fail", "swat still fails on timeout");

const duo = createGame({ pack: [SWAT_FLY], games: 1, shuffle: false, playerMode: "2p", random: () => 0.2 });
duo.start();
let steps = Math.ceil(1.8 / (1 / 60)) + 2;
for (let i = 0; i < steps; i += 1) duo.tick(1 / 60, idle());
assert(duo.getState().layout === "split", "2P swat uses split lanes");
assert(duo.getState().scene?.lanes?.length === 2, "2P swat mirrors a fly per lane");

console.log("game/wave2.test.mjs passed");
