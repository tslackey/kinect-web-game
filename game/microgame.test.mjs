import {
  GAME_COUNT,
  MICROGAME_OUTCOMES,
  ORB_HIT,
  PROMPT_DURATION,
  RESULT_DURATION,
  createGame,
  defineMicrogame,
  isMicrogameDef,
  isPlayOutcome,
  sequenceFromPack,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle(source = "idle") {
  return { source, poses: [], timestamp: 0 };
}

function drain(game, seconds, sample = idle()) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample);
  }
}

assert(isMicrogameDef(ORB_HIT), "the orb game should satisfy the contract");
assert(ORB_HIT.prompt.length > 0, "a microgame must ship a prompt");
assert(ORB_HIT.duration > 0, "a microgame must ship a duration");
assert(typeof ORB_HIT.create === "function", "a microgame must ship create()");

const play = ORB_HIT.create({ random: () => 0.4, index: 1, duration: ORB_HIT.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
assert(MICROGAME_OUTCOMES.includes("win"), "win is part of the contract");
assert(MICROGAME_OUTCOMES.includes("fail"), "fail is part of the contract");
assert(play.getView().target, "the orb view exposes a target for render");

assert(!isMicrogameDef({}), "an empty object is not a microgame");
assert(!isMicrogameDef({ id: "x", prompt: "Go", duration: 0, create() {} }), "duration must be positive");
assert(!isMicrogameDef({ id: "x", prompt: "", duration: 1, create() {} }), "prompt must be non-empty");

const named = defineMicrogame({
  id: "stub",
  prompt: "Wait",
  duration: 0.4,
  create() {
    let t = 0;
    return {
      start() {
        t = 0;
      },
      tick(dt) {
        t += dt;
        return t >= 0.2 ? "win" : "playing";
      },
      getView() {
        return {
          target: { id: 1, x: 0.5, y: 0.5, vx: 0, vy: 0 },
          timeLeft: Math.max(0, 0.4 - t),
          lifetime: 0.4,
        };
      },
    };
  },
});
assert(named.id === "stub", "defineMicrogame should return the def");

const sequenced = sequenceFromPack([named], 3, ORB_HIT);
assert(sequenced.length === 3, "a short pack should repeat to fill the session");
assert(
  sequenced.every((def) => def.id === "stub"),
  "the session should keep the plugged-in game",
);
assert(sequenceFromPack([], GAME_COUNT, ORB_HIT).every((def) => def.id === "orb-hit"), "an empty pack falls back to the orb");

const stubbed = createGame({ pack: [named, named], games: 2 });
stubbed.start();
assert(stubbed.getState().phase === "prompt", "Play should flash the prompt first");
assert(stubbed.getState().prompt === "Wait", "the HUD prompt should come from the pack");
assert(stubbed.getState().gameId === "stub", "the live game id should come from the pack");

drain(stubbed, PROMPT_DURATION);
assert(stubbed.getState().phase === "playing", "the prompt should hand off to play");

drain(stubbed, 0.25);
assert(stubbed.getState().phase === "result", "a pack win should resolve the game");
assert(stubbed.getState().result === "win", "the session should record win, not invent a miss");
assert(stubbed.getState().score === 1, "the session should score a pack win");

drain(stubbed, RESULT_DURATION);
assert(stubbed.getState().phase === "prompt", "next should start after the result beat");
assert(stubbed.getState().game === 2, "the session should advance to the next game");

const failer = defineMicrogame({
  id: "timeout-only",
  prompt: "Hold",
  duration: 0.3,
  create() {
    let timeLeft = 0.3;
    return {
      start() {
        timeLeft = 0.3;
      },
      tick(dt) {
        timeLeft = Math.max(0, timeLeft - dt);
        return timeLeft <= 0 ? "fail" : "playing";
      },
      getView() {
        return {
          target: { id: 1, x: 0.6, y: 0.4, vx: 0, vy: 0 },
          timeLeft,
          lifetime: 0.3,
        };
      },
    };
  },
});

const timed = createGame({ pack: [failer], games: 1 });
timed.start();
drain(timed, PROMPT_DURATION);
const far = {
  source: "mouse",
  poses: [{ id: "p1", source: "mouse", joints: { pointer: { x: 0.05, y: 0.05, confidence: 1 } } }],
  timestamp: 0,
};
timed.tick(1 / 60, far);
assert(timed.getState().phase === "playing", "a far pointer is not a wrong-gesture fail");
assert(timed.getState().result === null, "only timeout or success should resolve");
drain(timed, 0.35, far);
assert(timed.getState().result === "fail", "timeout should be the fail path");
assert(timed.getState().score === 0, "a timeout fail should not score");

console.log("game/microgame.test.mjs passed");
