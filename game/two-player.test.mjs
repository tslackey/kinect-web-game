import { ORB_HIT, PROMPT_DURATION, createGame, listSampleStrikers } from "./index.js";
import { assembleSample } from "../input/poses.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cyclingRandom(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

function drain(game, seconds, pose) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, pose ?? { source: "idle", poses: [], timestamp: 0 });
  }
}

function skipPrompt(game) {
  drain(game, PROMPT_DURATION);
}

function twoPoses(p1Joints, p2Joints, source = "webcam") {
  return {
    source,
    poses: [
      { id: "p1", source, joints: p1Joints },
      { id: "p2", source, joints: p2Joints },
    ],
    timestamp: 0,
  };
}

function laneTarget(game, player) {
  const lane = game.getState().scene?.lanes?.find((item) => item.player === player);
  return lane?.target ?? game.getState().target;
}

const strikers = listSampleStrikers(
  twoPoses(
    { left_wrist: { x: 0.2, y: 0.3, confidence: 0.9 } },
    { right_wrist: { x: 0.8, y: 0.4, confidence: 0.9 } },
  ),
);
assert(strikers.length === 2, "each pose map contributes its own hands");

const scored = createGame({
  random: cyclingRandom([0.2, 0.4, 0.1, 0.2, 0.7, 0.6]),
  pack: [ORB_HIT],
});
scored.start();
skipPrompt(scored);
const p2Orb = laneTarget(scored, "p2");
scored.tick(
  1 / 60,
  twoPoses(
    { nose: { x: 0.2, y: 0.4, confidence: 1 }, left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
    { nose: { x: 0.8, y: 0.4, confidence: 1 }, right_wrist: { x: p2Orb.x, y: p2Orb.y, confidence: 1 } },
  ),
);
assert(scored.getState().score === 1, "the second pose map can hit its own orb");
assert(scored.getState().scores.p2 === 1, "that hit credits P2, not a shared pool");
assert(scored.getState().phase === "playing", "P1 can still play after P2 scores");
assert(scored.getState().markers.length === 2, "two pose maps should drive two markers");

const solo = createGame({ random: cyclingRandom([0.65, 0.55, 0.2, 0.25]), pack: [ORB_HIT] });
solo.start();
skipPrompt(solo);
const soloOrb = solo.getState().target;
solo.tick(1 / 60, {
  source: "webcam",
  poses: [
    {
      id: "p1",
      source: "webcam",
      joints: { left_wrist: { x: soloOrb.x, y: soloOrb.y, confidence: 1 } },
    },
  ],
  timestamp: 0,
});
assert(solo.getState().score === 1, "one camera / one pose map still plays solo");
assert(solo.getState().markers.length === 1, "solo play keeps a single marker");

const pointers = createGame({ random: cyclingRandom([0.3, 0.35, 0.8, 0.2]), pack: [ORB_HIT] });
pointers.start();
skipPrompt(pointers);
const pointerOrb = pointers.getState().target;
const standins = assembleSample({
  pointers: [
    { x: 0.1, y: 0.1, confidence: 1 },
    { x: laneTarget(pointers, "p2").x, y: laneTarget(pointers, "p2").y, confidence: 1 },
  ],
});
assert(standins.poses.length === 2, "two test pointers are two pose maps");
pointers.tick(1 / 60, standins);
assert(pointers.getState().score === 1, "the second test pointer should score");
assert(pointers.getState().scores.p2 === 1, "the right-hand pointer credits P2");
assert(pointers.getState().inputSource === "mouse", "two pointers still report mouse");

const cameraBlocksMouse = createGame({
  random: cyclingRandom([0.55, 0.5, 0.2, 0.25]),
  pack: [ORB_HIT],
});
cameraBlocksMouse.start();
skipPrompt(cameraBlocksMouse);
const blockedOrb = cameraBlocksMouse.getState().target;
const cameraWins = assembleSample({
  webcamPoses: [{ nose: { x: 0.08, y: 0.92, confidence: 1 }, left_wrist: { x: 0.06, y: 0.9, confidence: 1 } }],
  pointers: [{ x: blockedOrb.x, y: blockedOrb.y, confidence: 1 }],
});
assert(cameraWins.poses.length === 1, "camera-present samples keep a single camera body");
assert(cameraWins.source === "webcam", "camera-present samples do not report mouse");
cameraBlocksMouse.tick(1 / 60, cameraWins);
assert(cameraBlocksMouse.getState().score === 0, "a pointer over the orb must not score while a camera body is live");
assert(cameraBlocksMouse.getState().phase === "playing", "only the far camera skeleton is in play");

const cameraAbsent = assembleSample({
  webcamPoses: [],
  pointers: [{ x: blockedOrb.x, y: blockedOrb.y, confidence: 1 }],
});
assert(cameraAbsent.source === "mouse", "camera-absent samples still inject the pointer");
cameraBlocksMouse.tick(1 / 60, cameraAbsent);
assert(cameraBlocksMouse.getState().score === 1, "pointer still plays the moment the camera body is gone");

const firstThenSecond = createGame({
  random: cyclingRandom([0.15, 0.2, 0.85, 0.8, 0.4, 0.5]),
  pack: [ORB_HIT],
});
firstThenSecond.start();
skipPrompt(firstThenSecond);
const firstOrb = laneTarget(firstThenSecond, "p1");
firstThenSecond.tick(
  1 / 60,
  twoPoses(
    { nose: { x: 0.22, y: 0.4, confidence: 1 }, pointer: { x: firstOrb.x, y: firstOrb.y, confidence: 1 } },
    { nose: { x: 0.82, y: 0.4, confidence: 1 }, left_wrist: { x: 0.96, y: 0.08, confidence: 1 } },
  ),
);
assert(firstThenSecond.getState().score === 1, "the first pose map can still hit when a second map is present");
assert(firstThenSecond.getState().scores.p1 === 1, "that hit credits P1");

console.log("game/two-player.test.mjs passed");
