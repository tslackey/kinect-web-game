import {
  createGame,
  HIT_RADIUS,
  TARGET_LIFETIME,
  hitsTarget,
  listStrikers,
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

assert(hitsTarget([{ x: 0.5, y: 0.5, confidence: 1 }], { id: 1, x: 0.5, y: 0.5, vx: 0, vy: 0 }), "exact overlap is a hit");
assert(
  !hitsTarget([{ x: 0, y: 0, confidence: 1 }], { id: 1, x: 1, y: 1, vx: 0, vy: 0 }),
  "far joints should miss",
);
assert(listStrikers({}).length === 0, "no joints means no strikers");
assert(listStrikers({ left_wrist: { x: 0.2, y: 0.3, confidence: 0.9 } }).length === 1, "wrists count");
assert(listStrikers({ pointer: { x: 0.2, y: 0.3, confidence: 1 } }).length === 1, "pointer counts");
assert(
  listStrikers({ left_wrist: { x: 0.2, y: 0.3, confidence: 0.1 } }).length === 0,
  "low-confidence wrists should not strike",
);

const gated = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2]) });
const gatedOrb = { ...gated.getState().target };
gated.tick(1 / 60, sample({ left_wrist: { x: gatedOrb.x, y: gatedOrb.y, confidence: 0.95 } }));
assert(gated.getState().phase === "start", "the start screen should ignore hits");
assert(gated.getState().score === 0, "the start screen should not score");

const waiting = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2]) });
waiting.start();
const firstTarget = { ...waiting.getState().target };
for (let i = 0; i < 240; i += 1) {
  waiting.tick(1 / 60, sample({}));
}
assert(waiting.getState().phase === "waiting", "idle time should not fail the attempt");
assert(waiting.getState().score === 0, "idle time should not score");
assert(waiting.getState().timeLeft === null, "waiting orbs have no timer");
assert(
  Math.hypot(waiting.getState().target.x - firstTarget.x, waiting.getState().target.y - firstTarget.y) > 0.001,
  "the waiting orb should float",
);

const scored = createGame({ random: cyclingRandom([0.15, 0.2, 0.85, 0.8, 0.3, 0.4, 0.1, 0.2]) });
scored.start();
const orb = scored.getState().target;
scored.tick(1 / 60, sample({ left_wrist: { x: orb.x, y: orb.y, confidence: 0.95 } }));
assert(scored.getState().score === 1, "a hand on the orb should score");
assert(scored.getState().phase === "playing", "first hit starts the attempt");
assert(scored.getState().target.id !== orb.id, "a hit should spawn a new orb");
assert(Math.abs((scored.getState().timeLeft ?? 0) - TARGET_LIFETIME) < 1e-9, "a hit should refresh the timer");
assert(
  Math.hypot(scored.getState().target.x - orb.x, scored.getState().target.y - orb.y) > HIT_RADIUS * 0.5,
  "the next orb should not sit on the last hit",
);

const pointerGame = createGame({ random: cyclingRandom([0.7, 0.6, 0.2, 0.25, 0.4, 0.5]) });
pointerGame.start();
const pointerOrb = pointerGame.getState().target;
pointerGame.tick(1 / 60, sample({ pointer: { x: pointerOrb.x, y: pointerOrb.y, confidence: 1 } }, "mouse"));
assert(pointerGame.getState().score === 1, "pointer should be able to hit");
assert(pointerGame.getState().inputSource === "mouse", "mouse source should pass through");

const missed = createGame({ random: cyclingRandom([0.3, 0.3, 0.8, 0.7, 0.2, 0.9]) });
missed.start();
const startOrb = missed.getState().target;
missed.tick(1 / 60, sample({ right_wrist: { x: startOrb.x, y: startOrb.y, confidence: 1 } }));
assert(missed.getState().phase === "playing", "setup hit should start play");
const playingOrb = missed.getState().target;
for (let i = 0; i < 240; i += 1) {
  missed.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
}
assert(missed.getState().phase === "between", "timeout without a hit should end the round");
assert(missed.getState().score === 1, "a miss should keep the score");
assert(missed.getState().timeLeft === 0, "a missed round shows an empty timer");
assert(missed.getState().target.id === playingOrb.id, "a miss should leave the last orb");

missed.tick(1 / 60, sample({ right_wrist: { x: missed.getState().target.x, y: missed.getState().target.y, confidence: 1 } }));
assert(missed.getState().score === 1, "hits after a miss should not score");
assert(missed.getState().phase === "between", "the round stays over until the next one starts");

missed.reset();
assert(missed.getState().phase === "start", "reset should return to the start screen");
assert(missed.getState().score === 0, "reset should clear the score");
assert(missed.getState().timeLeft === null, "reset should clear the timer");

console.log("game/verb.test.mjs passed");
