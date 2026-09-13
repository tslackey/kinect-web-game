import {
  ORB_HIT,
  PLAY_DURATION,
  PROMPT_DURATION,
  RESULT_DURATION,
  START_DWELL,
  START_HOLD,
  createGame,
  createStartDwell,
  startHoldFor,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pose(joints, source = "webcam") {
  return {
    source,
    poses: [{ id: "p1", source, joints }],
    timestamp: 0,
  };
}

function twoPoses(p1Joints, p2Joints) {
  return {
    source: "webcam",
    poses: [
      { id: "p1", source: "webcam", joints: p1Joints },
      { id: "p2", source: "webcam", joints: p2Joints },
    ],
    timestamp: 0,
  };
}

function drain(game, seconds, sample) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample);
  }
}

function skipPrompt(game, sample = pose({})) {
  drain(game, PROMPT_DURATION, sample);
}

function skipResult(game, sample = pose({})) {
  drain(game, RESULT_DURATION, sample);
}

assert(START_DWELL >= 0.6 && START_DWELL <= 1, "dwell is the 0.6–1.0s hold");
assert(START_HOLD.y <= 0.28, "the mark hugs the top");
assert(START_HOLD.x >= 0.72, "the mark hugs the right corner");
assert(!(START_HOLD.x === 0.5 && START_HOLD.y > 0.55), "the mark is not bottom-center");
assert(startHoldFor("prompt").active === false, "prompt is not a dwell gate");
assert(startHoldFor("start").active === true, "start shows the mark");
assert(startHoldFor("over").label === "Play again", "game-over label is Play again");

const dwell = createStartDwell();
const onMark = pose({ left_wrist: { x: START_HOLD.x, y: START_HOLD.y, confidence: 1 } });
const away = pose({ left_wrist: { x: 0.12, y: 0.18, confidence: 1 } });

const mid = dwell.update(0.4, onMark, "start");
assert(mid.active === true, "start gate is active");
assert(mid.hovering === true, "a wrist on the mark is hovering");
assert(mid.progress > 0.4 && mid.progress < 0.6, "progress fills while hovering");
assert(mid.fired === false, "a partial hold does not start");

const left = dwell.update(0.1, away, "start");
assert(left.progress === 0, "leaving the mark resets the fill");
assert(left.hovering === false, "leave clears hover");
assert(left.fired === false, "a reset hold does not fire");

const again = dwell.update(0.4, onMark, "start");
assert(again.progress < 0.6, "re-entering starts the fill from zero");
assert(again.fired === false, "a second partial hold still needs the full dwell");

const done = dwell.update(0.5, onMark, "start");
assert(done.progress === 1, "a full hold fills the mark");
assert(done.fired === true, "the frame the dwell completes fires once");
const extra = dwell.update(0.1, onMark, "start");
assert(extra.fired === false, "a completed hold does not keep firing");

const playing = dwell.update(1, onMark, "playing");
assert(playing.active === false, "dwell is off mid-microgame");
assert(playing.fired === false, "dwell must not fire mid-microgame");
assert(playing.progress === 0, "playing has no leftover fill");

const other = createStartDwell();
const p2 = twoPoses(
  { left_wrist: { x: 0.12, y: 0.18, confidence: 1 } },
  { right_wrist: { x: START_HOLD.x, y: START_HOLD.y, confidence: 1 } },
);
const shared = other.update(START_DWELL, p2, "start");
assert(shared.fired === true, "either body can fill the shared mark");

const pointerDwell = createStartDwell();
const pointer = pose({ pointer: { x: START_HOLD.x, y: START_HOLD.y, confidence: 1 } }, "mouse");
const clicked = pointerDwell.update(START_DWELL, pointer, "over");
assert(clicked.fired === true, "pointer can fill when the mouse stand-in is allowed");
assert(clicked.label === "Play again", "over-screen hold is play-again");

const session = createGame({ random: () => 0.2, games: 1, pack: [ORB_HIT] });
assert(session.getState().startHold.active === true, "the start screen shows the hold mark");
session.tick(1 / 60, onMark);
assert(session.getState().phase === "start", "a single hover frame does not start");
drain(session, START_DWELL, onMark);
assert(session.getState().phase === "prompt", "a full hold starts the session");
assert(session.getState().startHold.active === false, "the mark hides once play begins");

const live = createGame({ random: () => 0.2, games: 1, pack: [ORB_HIT] });
live.start();
assert(live.getState().phase === "prompt", "click Play still starts");
skipPrompt(live, away);
assert(live.getState().phase === "playing", "play is live");
drain(live, START_DWELL + 0.3, onMark);
assert(live.getState().phase === "playing", "holding the mark mid-game must not restart");
assert(live.getState().score === 0, "the start mark is not a hit target mid-game");

const timeLeft = live.getState().timeLeft ?? PLAY_DURATION;
drain(live, timeLeft + 1 / 60, away);
assert(live.getState().phase === "result", "timeout still resolves");
skipResult(live, away);
assert(live.getState().phase === "over", "the session ends on game-over");
assert(live.getState().startHold.active === true, "game-over shows the hold mark");
assert(live.getState().startHold.label === "Play again", "game-over label is Play again");
drain(live, START_DWELL, onMark);
assert(live.getState().phase === "prompt", "holding Play again starts a new session");
assert(live.getState().score === 0, "Play again clears the score");

console.log("game/start-dwell.test.mjs passed");
