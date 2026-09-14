import {
  DEFAULT_PACK,
  DOUGH_BREAK,
  DOUGH_DURATION,
  DOUGH_STROKE,
  DOUGH_STROKES,
  PLAY_DURATION,
  PROMPT_DURATION,
  ROLL_DOUGH,
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
  return {
    source,
    poses: [{ id: "p1", source, joints }],
    timestamp: 0,
  };
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

/**
 * @param {ReturnType<ROLL_DOUGH.create>} play
 * @param {number} seconds
 * @param {object} sample
 */
function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    const pose = typeof sample === "function" ? sample(play) : sample;
    outcome = play.tick(1 / 60, pose);
    if (outcome !== "playing") return outcome;
  }
  return outcome;
}

function bothHands(play, y, source = "webcam") {
  const scene = play.getView().scene;
  return oneBody(
    {
      left_wrist: { x: scene.left.x, y, confidence: 1 },
      right_wrist: { x: scene.right.x, y, confidence: 1 },
    },
    source,
  );
}

function strokePin(play, fromY, toY, sampleAt) {
  const dir = toY >= fromY ? 1 : -1;
  const step = 0.02 * dir;
  let outcome = "playing";
  for (let y = fromY; dir > 0 ? y <= toY : y >= toY; y += step) {
    outcome = play.tick(1 / 60, sampleAt(y));
  }
  return outcome;
}

assert(isMicrogameDef(ROLL_DOUGH), "roll the dough must satisfy the microgame contract");
assert(ROLL_DOUGH.prompt === "Roll!", "on-screen prompt is Roll!");
assert(ROLL_DOUGH.id === "roll-dough", "id is roll-dough");
assert(ROLL_DOUGH.duration === DOUGH_DURATION, "pack duration should match the dough timer");
assert(DOUGH_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(DOUGH_STROKES >= 3, "flattening takes several strokes");
assert(DEFAULT_PACK.some((def) => def.id === "roll-dough"), "roll the dough joins the session pack");

const play = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "roll-dough", "the view should expose the dough scene");
assert(startView.scene.strokes === 0, "strokes start at zero");
assert(startView.scene.dough.flatten === 0, "dough starts unflattened");
assert(startView.scene.pin.held === false, "the pin starts unheld");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the dough timer should be live");

const pin = startView.scene.pin;
assert(
  drainPlay(play, 0.5, oneBody({ left_wrist: { x: pin.x, y: pin.y, confidence: 1 } })) === "playing",
  "one wrist on the pin is not enough",
);
assert(play.getView().scene.pin.held === false, "a single wrist should not grip the pin");

const squashLike = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
squashLike.start();
assert(
  drainPlay(squashLike, 0.8, bothHands(squashLike, squashLike.getView().scene.pin.y)) === "playing",
  "both hands parked on the pin without stroking is not Squash it",
);
assert(squashLike.getView().scene.pin.held === true, "both wrists on the handles should grip");
assert(squashLike.getView().scene.strokes === 0, "a static grip is zero strokes");

const rolled = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
rolled.start();
const mid = rolled.getView().scene.pin.y;
const down = mid + DOUGH_STROKE + 0.04;
const up = mid - DOUGH_STROKE - 0.04;
strokePin(rolled, mid, down, (y) => bothHands(rolled, y));
assert(rolled.getView().scene.strokes === 0, "the first leg is not a stroke until it reverses");
strokePin(rolled, down, up, (y) => bothHands(rolled, y));
assert(rolled.getView().scene.strokes >= 1, "a reverse after travel counts a stroke");
strokePin(rolled, up, down, (y) => bothHands(rolled, y));
strokePin(rolled, down, up, (y) => bothHands(rolled, y));
assert(rolled.getView().scene.strokes >= DOUGH_STROKES || rolled.tick(1 / 60, bothHands(rolled, up)) === "win", "enough strokes flatten the dough");
assert(
  rolled.getView().scene.strokes >= DOUGH_STROKES || drainPlay(rolled, 0.05, bothHands(rolled, up)) === "win",
  "N strokes should win",
);
assert(rolled.getView().scene.dough.flatten >= 1 || rolled.getView().timeLeft < DOUGH_DURATION, "dough flatten tracks strokes");

const won = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
won.start();
const home = won.getView().scene.pin.y;
const low = home + DOUGH_STROKE + 0.05;
const high = home - DOUGH_STROKE - 0.05;
strokePin(won, home, low, (y) => bothHands(won, y));
strokePin(won, low, high, (y) => bothHands(won, y));
strokePin(won, high, low, (y) => bothHands(won, y));
const last = strokePin(won, low, high, (y) => bothHands(won, y));
assert(last === "win" || won.tick(1 / 60, bothHands(won, high)) === "win", "three reversals after travel win");
assert(won.getView().scene.dough.flatten === 1, "a win flattens the dough");

const pointerRoll = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
pointerRoll.start();
const px = pointerRoll.getView().scene.pin.x;
const py = pointerRoll.getView().scene.pin.y;
const pLow = py + DOUGH_STROKE + 0.05;
const pHigh = py - DOUGH_STROKE - 0.05;
const pointerAt = (y) => oneBody({ pointer: { x: px, y, confidence: 1 } }, "mouse");
strokePin(pointerRoll, py, pLow, pointerAt);
strokePin(pointerRoll, pLow, pHigh, pointerAt);
strokePin(pointerRoll, pHigh, pLow, pointerAt);
const pointerWin = strokePin(pointerRoll, pLow, pHigh, pointerAt);
assert(pointerWin === "win" || pointerRoll.tick(1 / 60, pointerAt(pHigh)) === "win", "pointer can roll when the camera is off");

const duo = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
duo.start();
const left = duo.getView().scene.left;
const right = duo.getView().scene.right;
const duoAt = (y) =>
  twoBodies(
    { left_wrist: { x: left.x, y, confidence: 1 } },
    { right_wrist: { x: right.x, y, confidence: 1 } },
  );
const dHome = duo.getView().scene.pin.y;
const dLow = dHome + DOUGH_STROKE + 0.05;
const dHigh = dHome - DOUGH_STROKE - 0.05;
strokePin(duo, dHome, dLow, duoAt);
strokePin(duo, dLow, dHigh, duoAt);
strokePin(duo, dHigh, dLow, duoAt);
const duoWin = strokePin(duo, dLow, dHigh, duoAt);
assert(duoWin === "win" || duo.tick(1 / 60, duoAt(dHigh)) === "win", "two bodies can share the pin");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
const timeoutPlay = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
timeoutPlay.start();
assert(timeoutPlay.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(drainPlay(timeoutPlay, DOUGH_DURATION + 0.1, far) === "fail", "timeout before flattening should fail");

const broke = ROLL_DOUGH.create({ random: () => 0.2, index: 1, duration: ROLL_DOUGH.duration });
broke.start();
drainPlay(broke, 0.1, bothHands(broke, broke.getView().scene.pin.y));
assert(broke.getView().scene.pin.held === true, "grip should land before a break fail");
assert(drainPlay(broke, DOUGH_BREAK + 0.15, idle()) === "fail", "leaving the pin too long after a grip fails");

const session = createGame({
  pack: [ROLL_DOUGH],
  games: 1,
  shuffle: false,
  random: () => 0.2,
});
session.start();
const steps = Math.ceil(PROMPT_DURATION / (1 / 60)) + 2;
for (let i = 0; i < steps; i += 1) session.tick(1 / 60, idle());
assert(session.getState().gameId === "roll-dough", "the session can play roll the dough");
assert(session.getState().backgroundId === "dough", "dough uses the dough stage id");

console.log("game/dough.test.mjs passed");
