import { createGame, listSampleStrikers } from "./index.js";
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

const strikers = listSampleStrikers(
  twoPoses(
    { left_wrist: { x: 0.2, y: 0.3, confidence: 0.9 } },
    { right_wrist: { x: 0.8, y: 0.4, confidence: 0.9 } },
  ),
);
assert(strikers.length === 2, "each pose map contributes its own hands");

const scored = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2, 0.7, 0.6]) });
scored.start();
const orb = scored.getState().target;
scored.tick(
  1 / 60,
  twoPoses(
    { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
    { right_wrist: { x: orb.x, y: orb.y, confidence: 1 } },
  ),
);
assert(scored.getState().score === 1, "player 2 can hit the shared orb");
assert(scored.getState().phase === "playing", "a player-2 hit still starts the attempt");
assert(scored.getState().markers.length === 2, "two pose maps should drive two markers");

const solo = createGame({ random: cyclingRandom([0.65, 0.55, 0.2, 0.25]) });
solo.start();
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

const pointers = createGame({ random: cyclingRandom([0.3, 0.35, 0.8, 0.2]) });
pointers.start();
const pointerOrb = pointers.getState().target;
const standins = assembleSample({
  pointers: [
    { x: 0.1, y: 0.1, confidence: 1 },
    { x: pointerOrb.x, y: pointerOrb.y, confidence: 1 },
  ],
});
assert(standins.poses.length === 2, "two test pointers are two pose maps");
pointers.tick(1 / 60, standins);
assert(pointers.getState().score === 1, "the second test pointer should score");
assert(pointers.getState().inputSource === "mouse", "two pointers still report mouse");

const firstThenSecond = createGame({ random: cyclingRandom([0.15, 0.2, 0.85, 0.8, 0.4, 0.5]) });
firstThenSecond.start();
const firstOrb = firstThenSecond.getState().target;
firstThenSecond.tick(
  1 / 60,
  twoPoses(
    { pointer: { x: firstOrb.x, y: firstOrb.y, confidence: 1 } },
    { left_wrist: { x: 0.02, y: 0.98, confidence: 1 } },
  ),
);
assert(firstThenSecond.getState().score === 1, "player 1 can still hit when player 2 is present");

console.log("game/two-player.test.mjs passed");
