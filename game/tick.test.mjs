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

console.log("game/tick.test.mjs passed");
