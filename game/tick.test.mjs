import { createGame } from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const game = createGame();
const first = { ...game.getState().marker };
game.tick(1 / 60, { source: "idle", joints: {}, timestamp: 0 });
const afterIdle = { ...game.getState().marker };
assert(game.getState().ticks === 1, "tick count should increment");
assert(
  Math.hypot(afterIdle.x - first.x, afterIdle.y - first.y) > 0.001,
  "idle tick should move the marker",
);

for (let i = 0; i < 90; i += 1) {
  game.tick(1 / 60, {
    source: "mouse",
    joints: { pointer: { x: 0.9, y: 0.2, confidence: 1 } },
    timestamp: i,
  });
}

const steered = game.getState().marker;
assert(steered.x > 0.8, "marker should follow the pointer on x");
assert(steered.y < 0.35, "marker should follow the pointer on y");
assert(game.getState().inputSource === "mouse", "source should reflect input");

const poseGame = createGame();
for (let i = 0; i < 90; i += 1) {
  poseGame.tick(1 / 60, {
    source: "webcam",
    poses: [
      {
        id: "p1",
        source: "webcam",
        joints: {
          nose: { x: 0.2, y: 0.72, confidence: 0.94 },
          left_wrist: { x: 0.15, y: 0.4, confidence: 0.9 },
        },
      },
    ],
    timestamp: i,
  });
}

const followed = poseGame.getState();
assert(followed.inputSource === "webcam", "source should reflect webcam");
assert(followed.marker.x < 0.25, "marker should follow the striking wrist on x");
assert(followed.marker.y < 0.5, "marker should follow the striking wrist on y");
assert(followed.pose?.poses[0].joints.nose?.x === 0.2, "game should keep webcam joints on the pose map");
assert(followed.markers.length === 1, "one pose map should drive one marker");

console.log("game/tick.test.mjs passed");
