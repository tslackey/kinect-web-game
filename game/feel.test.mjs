import { HIT_RADIUS, ORB_HIT, PROMPT_DURATION, RESULT_DURATION, createGame } from "./index.js";

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

function drain(game, seconds, pose = sample({})) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, pose);
  }
}

function skipPrompt(game) {
  drain(game, PROMPT_DURATION);
}

function skipResult(game) {
  drain(game, RESULT_DURATION);
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
  games: 2,
  pack: [ORB_HIT],
  playerMode: "1p",
});

assert(game.getState().flash === null, "the start screen has no flash");

game.start();
assert(game.getState().flash === null, "Play should not invent a flash");
assert(game.getState().phase === "prompt", "Play should open on the prompt, not a hit");

skipPrompt(game);
const firstOrb = { ...game.getState().target };
hitCurrent(game);
const hitFlash = game.getState().flash;
assert(hitFlash?.kind === "hit", "a scored hit should emit a hit flash");
assert(hitFlash.score === 1, "the hit flash should carry the new score");
assert(
  Math.hypot(hitFlash.x - firstOrb.x, hitFlash.y - firstOrb.y) <= HIT_RADIUS,
  "the hit flash should sit on the orb that scored",
);
assert(game.getState().phase === "result", "juice must not skip the result beat");
assert(game.getState().score === 1, "juice must not change the score");

const hitId = hitFlash.id;
game.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
assert(game.getState().flash?.id === hitId, "an idle tick should leave the last flash in place");

skipResult(game);
assert(game.getState().game === 2, "the session should still advance after a hit flash");
assert(game.getState().phase === "prompt", "next game should prompt after the win juice");

skipPrompt(game);
missCurrent(game);
const missFlash = game.getState().flash;
assert(missFlash?.kind === "miss", "a timed-out game should emit a miss flash");
assert(missFlash.id !== hitId, "each cue should get a new flash id");
assert(game.getState().phase === "result", "a miss flash must not skip the result beat");
assert(game.getState().score === 1, "a miss flash must not change the score");

skipResult(game);
assert(game.getState().phase === "over", "the last miss should still be game over");
assert(game.getState().flash?.kind === "over", "game over should emit an over flash after the last miss");
assert(game.getState().score === 1, "game-over juice must keep the session score");

game.start();
assert(game.getState().flash === null, "Play again should clear the last flash");
assert(game.getState().score === 0, "Play again should still reset the score");

console.log("game/feel.test.mjs passed");
