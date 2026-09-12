import { createGame, HIT_RADIUS, ROUND_PAUSE } from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sample(joints, source = "webcam") {
  return { source, joints, timestamp: 0 };
}

function cyclingRandom(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

function hitCurrent(game) {
  const orb = game.getState().target;
  game.tick(1 / 60, sample({ left_wrist: { x: orb.x, y: orb.y, confidence: 1 } }));
}

function missCurrent(game) {
  const steps = Math.ceil(game.getState().lifetime / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
  }
}

const game = createGame({
  random: cyclingRandom([0.2, 0.35, 0.8, 0.15, 0.4, 0.6]),
  rounds: 2,
});

assert(game.getState().flash === null, "the start screen has no flash");

game.start();
assert(game.getState().flash === null, "Play should not invent a flash");

const firstOrb = { ...game.getState().target };
hitCurrent(game);
const hitFlash = game.getState().flash;
assert(hitFlash?.kind === "hit", "a scored hit should emit a hit flash");
assert(hitFlash.score === 1, "the hit flash should carry the new score");
assert(
  Math.hypot(hitFlash.x - firstOrb.x, hitFlash.y - firstOrb.y) <= HIT_RADIUS,
  "the hit flash should sit on the orb that scored",
);
assert(game.getState().phase === "playing", "juice must not change the hit verb");
assert(game.getState().score === 1, "juice must not change the score");

const hitId = hitFlash.id;
game.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
assert(game.getState().flash?.id === hitId, "an idle tick should leave the last flash in place");

missCurrent(game);
const missFlash = game.getState().flash;
assert(missFlash?.kind === "miss", "a timed-out round should emit a miss flash");
assert(missFlash.id !== hitId, "each cue should get a new flash id");
assert(game.getState().phase === "between", "a miss flash must not skip the between-round pause");
assert(game.getState().score === 1, "a miss flash must not change the score");

const pauseSteps = Math.ceil(ROUND_PAUSE / (1 / 60)) + 2;
for (let i = 0; i < pauseSteps; i += 1) {
  game.tick(1 / 60, sample({}));
}
assert(game.getState().round === 2, "the session should still advance after a miss flash");

hitCurrent(game);
missCurrent(game);
assert(game.getState().phase === "over", "the last miss should still be game over");
assert(game.getState().flash?.kind === "over", "game over should emit an over flash");
assert(game.getState().score === 2, "game-over juice must keep the session score");

game.start();
assert(game.getState().flash === null, "Play again should clear the last flash");
assert(game.getState().score === 0, "Play again should still reset the score");

console.log("game/feel.test.mjs passed");
