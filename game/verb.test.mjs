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

const waiting = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2]) });
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
const pointerOrb = pointerGame.getState().target;
pointerGame.tick(1 / 60, sample({ pointer: { x: pointerOrb.x, y: pointerOrb.y, confidence: 1 } }, "mouse"));
assert(pointerGame.getState().score === 1, "pointer should be able to hit");
assert(pointerGame.getState().inputSource === "mouse", "mouse source should pass through");

const failed = createGame({ random: cyclingRandom([0.3, 0.3, 0.8, 0.7, 0.2, 0.9]) });
const startOrb = failed.getState().target;
failed.tick(1 / 60, sample({ right_wrist: { x: startOrb.x, y: startOrb.y, confidence: 1 } }));
assert(failed.getState().phase === "playing", "setup hit should start play");
const playingOrb = failed.getState().target;
for (let i = 0; i < 240; i += 1) {
  failed.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
}
assert(failed.getState().phase === "failed", "timeout without a hit should fail");
assert(failed.getState().score === 1, "a miss should keep the score");
assert(failed.getState().timeLeft === 0, "failed attempts show an empty timer");
assert(failed.getState().target.id === playingOrb.id, "a miss should leave the last orb");

failed.tick(1 / 60, sample({ right_wrist: { x: failed.getState().target.x, y: failed.getState().target.y, confidence: 1 } }));
assert(failed.getState().score === 1, "hits after a fail should not score");
assert(failed.getState().phase === "failed", "the attempt stays failed until reset");

failed.reset();
assert(failed.getState().phase === "waiting", "reset should wait for the next first hit");
assert(failed.getState().score === 0, "reset should clear the score");
assert(failed.getState().timeLeft === null, "reset should clear the timer");

console.log("game/verb.test.mjs passed");
