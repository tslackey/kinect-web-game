import {
  createGame,
  ROUND_COUNT,
  ROUND_PAUSE,
  lifetimeForRound,
  driftScaleForRound,
} from "./index.js";

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

const landed = createGame({ random: cyclingRandom([0.2, 0.35, 0.8, 0.15, 0.4, 0.6]) });
assert(landed.getState().phase === "start", "a new game should wait on the start screen");
assert(landed.getState().round === 1, "the start screen is round 1");
assert(landed.getState().rounds === ROUND_COUNT, "default session is three rounds");

landed.start();
assert(landed.getState().phase === "waiting", "Play should open round 1");
assert(landed.getState().lifetime === lifetimeForRound(1), "round 1 uses the base orb timer");
assert(landed.getState().driftScale === driftScaleForRound(1), "round 1 uses the base drift");

hitCurrent(landed);
assert(landed.getState().score === 1, "the first hit still scores");
assert(landed.getState().roundHits === 1, "round hits should track the current round");
assert(landed.getState().phase === "playing", "a hit should start the orb timer");

missCurrent(landed);
assert(landed.getState().phase === "between", "a miss in round 1 should pause before round 2");
assert(landed.getState().score === 1, "session score should survive the miss");
assert(Math.abs((landed.getState().holdLeft ?? 0) - ROUND_PAUSE) < 0.05, "the pause should start full");

const pauseSteps = Math.ceil(ROUND_PAUSE / (1 / 60)) + 2;
for (let i = 0; i < pauseSteps; i += 1) {
  landed.tick(1 / 60, sample({}));
}
assert(landed.getState().phase === "waiting", "the next round should wait for a first hit");
assert(landed.getState().round === 2, "round 2 should follow the pause");
assert(landed.getState().roundHits === 0, "a new round should clear round hits");
assert(landed.getState().score === 1, "session score should carry into the next round");
assert(landed.getState().lifetime === lifetimeForRound(2), "round 2 should shave a little orb time");
assert(landed.getState().driftScale === driftScaleForRound(2), "round 2 should drift a little faster");
assert(landed.getState().lifetime < lifetimeForRound(1), "later rounds must be slightly harder");

hitCurrent(landed);
missCurrent(landed);
for (let i = 0; i < pauseSteps; i += 1) {
  landed.tick(1 / 60, sample({}));
}
assert(landed.getState().round === 3, "the third miss-cycle should reach the last round");
assert(landed.getState().lifetime === lifetimeForRound(3), "round 3 should use the last difficulty step");

hitCurrent(landed);
missCurrent(landed);
assert(landed.getState().phase === "over", "a miss in the last round should be game over");
assert(landed.getState().score === 3, "game over should keep the session score");

const overOrb = { ...landed.getState().target };
landed.tick(1 / 60, sample({ left_wrist: { x: overOrb.x, y: overOrb.y, confidence: 1 } }));
assert(landed.getState().score === 3, "game over should ignore further hits");
assert(landed.getState().phase === "over", "game over should stay until retry");

landed.start();
assert(landed.getState().phase === "waiting", "Play again should start a new session");
assert(landed.getState().score === 0, "Play again should clear the score");
assert(landed.getState().round === 1, "Play again should return to round 1");
assert(landed.getState().lifetime === lifetimeForRound(1), "a new session should reset difficulty");

const short = createGame({
  random: cyclingRandom([0.25, 0.3, 0.7, 0.2, 0.5, 0.4]),
  rounds: 1,
});
short.start();
hitCurrent(short);
missCurrent(short);
assert(short.getState().phase === "over", "a one-round session should end on the first miss");

short.reset();
assert(short.getState().phase === "start", "reset should show the start screen again");
short.start();
hitCurrent(short);
assert(short.getState().score === 1, "retry should be able to score again");
short.start();
assert(short.getState().phase === "playing", "start during a live round should be a no-op");
assert(short.getState().score === 1, "a no-op start should not reset a live round");

console.log("game/session.test.mjs passed");
