import {
  createGame,
  HIT_RADIUS,
  ORB_HIT,
  PROMPT_DURATION,
  RESULT_DURATION,
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

function drain(game, seconds, pose = sample({})) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, pose);
  }
}

function skipPrompt(game, pose = sample({})) {
  drain(game, PROMPT_DURATION, pose);
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

const gated = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2]), pack: [ORB_HIT] });
const gatedOrb = { ...gated.getState().target };
gated.tick(1 / 60, sample({ left_wrist: { x: gatedOrb.x, y: gatedOrb.y, confidence: 0.95 } }));
assert(gated.getState().phase === "start", "the start screen should ignore hits");
assert(gated.getState().score === 0, "the start screen should not score");

const waiting = createGame({ random: cyclingRandom([0.2, 0.4, 0.1, 0.2]), pack: [ORB_HIT] });
waiting.start();
const firstTarget = { ...waiting.getState().target };
for (let i = 0; i < 30; i += 1) {
  waiting.tick(1 / 60, sample({}));
}
assert(waiting.getState().phase === "prompt", "idle time during the prompt should not fail");
assert(waiting.getState().score === 0, "idle time should not score");
assert(waiting.getState().timeLeft === null, "prompt orbs have no play timer");
assert(
  Math.hypot(waiting.getState().target.x - firstTarget.x, waiting.getState().target.y - firstTarget.y) > 0.001,
  "the waiting orb should float",
);

const scored = createGame({
  random: cyclingRandom([0.15, 0.2, 0.85, 0.8, 0.3, 0.4, 0.1, 0.2]),
  pack: [ORB_HIT],
});
scored.start();
skipPrompt(scored);
const orb = scored.getState().target;
scored.tick(1 / 60, sample({ left_wrist: { x: orb.x, y: orb.y, confidence: 0.95 } }));
assert(scored.getState().score === 1, "a hand on the orb should win the game");
assert(scored.getState().phase === "result", "one hit ends the microgame");
assert(scored.getState().result === "win", "a hit is a win, not another orb");
assert(scored.getState().target.id === orb.id, "a win should leave the orb that scored");
assert(
  Math.hypot(scored.getState().target.x - orb.x, scored.getState().target.y - orb.y) <= HIT_RADIUS,
  "the scored orb should stay under the hand",
);

const pointerGame = createGame({
  random: cyclingRandom([0.7, 0.6, 0.2, 0.25, 0.4, 0.5]),
  pack: [ORB_HIT],
});
pointerGame.start();
skipPrompt(pointerGame);
const pointerOrb = pointerGame.getState().target;
pointerGame.tick(1 / 60, sample({ pointer: { x: pointerOrb.x, y: pointerOrb.y, confidence: 1 } }, "mouse"));
assert(pointerGame.getState().score === 1, "pointer should be able to hit");
assert(pointerGame.getState().inputSource === "mouse", "mouse source should pass through");

const keysGame = createGame({ random: cyclingRandom([0.4, 0.45, 0.2, 0.25]), pack: [ORB_HIT] });
keysGame.start();
skipPrompt(keysGame);
const keyOrb = keysGame.getState().target;
keysGame.tick(
  1 / 60,
  {
    source: "keyboard",
    poses: [{ id: "p1", source: "keyboard", joints: { pointer: { x: keyOrb.x, y: keyOrb.y, confidence: 1 } } }],
    timestamp: 0,
  },
);
assert(keysGame.getState().score === 1, "keyboard stand-in should be able to hit");
assert(keysGame.getState().inputSource === "keyboard", "keyboard source should pass through");

const missed = createGame({
  random: cyclingRandom([0.3, 0.3, 0.8, 0.7, 0.2, 0.9]),
  pack: [ORB_HIT],
});
missed.start();
skipPrompt(missed);
assert(missed.getState().phase === "playing", "play should be live after the prompt");
assert(Math.abs((missed.getState().timeLeft ?? 0) - TARGET_LIFETIME) < 0.05, "the orb timer starts with the game");
assert(TARGET_LIFETIME >= 15 && TARGET_LIFETIME <= 20, "the orb play window is 15–20s");
const playingOrb = missed.getState().target;
missed.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
assert(missed.getState().phase === "playing", "a far pose is not a wrong-gesture fail");
const missSteps = Math.ceil((missed.getState().lifetime ?? TARGET_LIFETIME) / (1 / 60)) + 2;
for (let i = 0; i < missSteps; i += 1) {
  missed.tick(1 / 60, sample({ nose: { x: 0.05, y: 0.05, confidence: 1 } }));
}
assert(missed.getState().phase === "result", "timeout without a hit should miss the game");
assert(missed.getState().result === "fail", "timeout is a fail");
assert(missed.getState().score === 0, "a miss before any win should keep score at 0");
assert(missed.getState().timeLeft === 0, "a missed game shows an empty timer");
assert(missed.getState().target.id === playingOrb.id, "a miss should leave the last orb");

missed.tick(1 / 60, sample({ right_wrist: { x: missed.getState().target.x, y: missed.getState().target.y, confidence: 1 } }));
assert(missed.getState().score === 0, "hits after a miss should not score");
assert(missed.getState().phase === "result", "the game stays resolved until next starts");

drain(missed, RESULT_DURATION);
assert(missed.getState().phase === "prompt" || missed.getState().phase === "over", "the result beat should advance");

missed.reset();
assert(missed.getState().phase === "start", "reset should return to the start screen");
assert(missed.getState().score === 0, "reset should clear the score");
assert(missed.getState().timeLeft === null, "reset should clear the timer");

console.log("game/verb.test.mjs passed");
