import {
  DEFAULT_PACK,
  DOUSE_FIRE,
  FEED_PET,
  GAME_COUNT,
  ORB_HIT,
  PLAY_DURATION,
  PROMPT_DURATION,
  RESULT_DURATION,
  STOMP_BUG,
  WATER_PLANT,
  createGame,
  lifetimeForGame,
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

function skipResult(game, pose = sample({})) {
  drain(game, RESULT_DURATION, pose);
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

assert(GAME_COUNT >= 3 && GAME_COUNT <= 5, "the default session stays a short sequence");
assert(PLAY_DURATION >= 15 && PLAY_DURATION <= 20, "the session play window is 15–20s");
assert(lifetimeForGame(1) === PLAY_DURATION, "orb game 1 uses the shared 18s default");
assert(lifetimeForGame(4) === PLAY_DURATION, "later orb games stay on the same 15–20s window");

const landed = createGame({
  random: cyclingRandom([0.2, 0.35, 0.8, 0.15, 0.4, 0.6]),
  games: 3,
  pack: [ORB_HIT],
});
assert(landed.getState().phase === "start", "a new game should wait on the start screen");
assert(landed.getState().game === 1, "the start screen is game 1");
assert(landed.getState().games === 3, "a short session is a run of games");
assert(landed.getState().round === undefined, "the session is games, not 3 rounds of one orb");

landed.start();
assert(landed.getState().phase === "prompt", "Play should flash a prompt, not open a live round");
assert(landed.getState().prompt === "Hit orb", "the first game should keep today's orb prompt");
assert(landed.getState().timeLeft === null, "the prompt beat has no play timer");
assert(landed.getState().lifetime === lifetimeForGame(1), "game 1 uses the base orb timer");

const promptedOrb = { ...landed.getState().target };
hitCurrent(landed);
assert(landed.getState().phase === "prompt", "hits during the prompt should not count");
assert(landed.getState().score === 0, "the prompt should not score");

skipPrompt(landed);
assert(landed.getState().phase === "playing", "the prompt should hand off to one short game");
assert(landed.getState().timeLeft != null, "play should start the timer immediately");
assert(landed.getState().target.id === promptedOrb.id, "the same orb should stay for the live game");

hitCurrent(landed);
assert(landed.getState().score === 1, "one hit should win the orb game");
assert(landed.getState().phase === "result", "a win should resolve, not spawn another orb");
assert(landed.getState().result === "win", "the result should be a win");
assert(landed.getState().target.id === promptedOrb.id, "a win should not start a new orb in the same game");

skipResult(landed);
assert(landed.getState().phase === "prompt", "next should start after a win, with a new prompt");
assert(landed.getState().game === 2, "the second game should follow the first");
assert(landed.getState().score === 1, "session score should carry into the next game");
assert(landed.getState().result === null, "a new game should clear the last result");
assert(landed.getState().lifetime === lifetimeForGame(2), "later games keep the same 15–20s play window");

skipPrompt(landed);
missCurrent(landed);
assert(landed.getState().phase === "result", "a timeout should resolve as a miss, then next");
assert(landed.getState().result === "fail", "timeout is the fail path");
assert(landed.getState().score === 1, "a miss should keep the session score");

skipResult(landed);
assert(landed.getState().phase === "prompt", "a miss should still start the next game");
assert(landed.getState().game === 3, "the third game should follow a miss");

skipPrompt(landed);
hitCurrent(landed);
assert(landed.getState().score === 2, "a later win should still score");
skipResult(landed);
assert(landed.getState().phase === "over", "the last game should end the session");
assert(landed.getState().score === 2, "game over should keep the session score");

const overOrb = { ...landed.getState().target };
landed.tick(1 / 60, sample({ left_wrist: { x: overOrb.x, y: overOrb.y, confidence: 1 } }));
assert(landed.getState().score === 2, "game over should ignore further hits");
assert(landed.getState().phase === "over", "game over should stay until retry");

landed.start();
assert(landed.getState().phase === "prompt", "Play again should start a new session");
assert(landed.getState().score === 0, "Play again should clear the score");
assert(landed.getState().game === 1, "Play again should return to the first game");
assert(landed.getState().lifetime === lifetimeForGame(1), "a new session should reset difficulty");

const short = createGame({
  random: cyclingRandom([0.25, 0.3, 0.7, 0.2, 0.5, 0.4]),
  games: 1,
  pack: [ORB_HIT],
});
short.start();
skipPrompt(short);
hitCurrent(short);
assert(short.getState().phase === "result", "a one-game session still shows the result beat");
skipResult(short);
assert(short.getState().phase === "over", "a one-game session should end after that game");

short.reset();
assert(short.getState().phase === "start", "reset should show the start screen again");
short.start();
skipPrompt(short);
hitCurrent(short);
assert(short.getState().score === 1, "retry should be able to score again");
short.start();
assert(short.getState().phase === "result", "start during a live session should be a no-op");
assert(short.getState().score === 1, "a no-op start should not reset a live game");

const mixed = createGame({ random: () => 0.2, shuffle: false });
mixed.start();
assert(mixed.getState().prompt === WATER_PLANT.prompt, "the default pack should open on Water plant");
assert(mixed.getState().gameId === "water-plant", "Water the plant is game 1");
assert(mixed.getState().scene?.kind === "water-plant", "the plant scene should be on the session view");

const petOnly = createGame({ random: () => 0.2, pack: [FEED_PET], games: 1 });
petOnly.start();
assert(petOnly.getState().prompt === FEED_PET.prompt, "a pet-only pack should flash Feed pet");
assert(petOnly.getState().gameId === "feed-pet", "Feed the pet is a pack entry");
assert(petOnly.getState().scene?.kind === "feed-pet", "the pet scene should be on the session view");

const fireOnly = createGame({ random: () => 0.2, pack: [DOUSE_FIRE], games: 1 });
fireOnly.start();
assert(fireOnly.getState().prompt === DOUSE_FIRE.prompt, "a fire-only pack should flash Douse fire");
assert(fireOnly.getState().gameId === "douse-fire", "Put out the fire is a pack entry");
assert(fireOnly.getState().scene?.kind === "douse-fire", "the fire scene should be on the session view");

const bugOnly = createGame({ random: () => 0.2, pack: [STOMP_BUG], games: 1 });
bugOnly.start();
assert(bugOnly.getState().prompt === STOMP_BUG.prompt, "a bug-only pack should flash Stomp bug");
assert(bugOnly.getState().gameId === "stomp-bug", "Stomp the bug is a pack entry");
assert(bugOnly.getState().scene?.kind === "stomp-bug", "the bug scene should be on the session view");

assert(
  DEFAULT_PACK.some((def) => def.id === "duck-beam") && DEFAULT_PACK.some((def) => def.id === "catch-fruit"),
  "the expanded pack includes the simple sweep",
);
assert(DEFAULT_PACK.length > 8, "the pack is larger than one session");

console.log("game/session.test.mjs passed");
