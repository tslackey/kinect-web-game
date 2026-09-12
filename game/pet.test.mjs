import {
  DEFAULT_PACK,
  FEED_DWELL,
  FEED_PET,
  PET_DURATION,
  PET_PICKUP_DWELL,
  PROMPT_DURATION,
  RESULT_DURATION,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle() {
  return { source: "idle", poses: [], timestamp: 0 };
}

function oneBody(joints, source = "webcam") {
  return {
    source,
    poses: [{ id: "p1", source, joints }],
    timestamp: 0,
  };
}

function twoBodies(p1Joints, p2Joints, source = "webcam") {
  return {
    source,
    poses: [
      { id: "p1", source, joints: p1Joints },
      { id: "p2", source, joints: p2Joints },
    ],
    timestamp: 0,
  };
}

/**
 * @param {ReturnType<FEED_PET.create>} play
 * @param {number} seconds
 * @param {object} sample
 */
function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    outcome = play.tick(1 / 60, sample);
  }
  return outcome;
}

function drainGame(game, seconds, sample = idle()) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample);
  }
}

assert(isMicrogameDef(FEED_PET), "feed the pet must satisfy the microgame contract");
assert(FEED_PET.prompt === "Feed pet", "on-screen prompt is Feed pet");
assert(FEED_PET.prompt.split(/\s+/).length <= 2, "prompt stays at two words");
assert(FEED_PET.duration === PET_DURATION, "pack duration should match the pet timer");
assert(PET_DURATION >= 5 && PET_DURATION <= 6, "duration is about 5–6s");
assert(DEFAULT_PACK.some((def) => def.id === "feed-pet"), "the session pack should include this game");
assert(DEFAULT_PACK.some((def) => def.id === "water-plant"), "water the plant should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "orb-hit"), "orb-hit should remain another game in the pack");
assert(DEFAULT_PACK[0].id === "water-plant", "the session pack should still open on water the plant");
assert(DEFAULT_PACK[1].id === "feed-pet", "feed the pet is the second real microgame");

const play = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "feed-pet", "the view should expose the pet scene");
assert(startView.scene.bowl.held === false, "the bowl starts on the field");
assert(startView.scene.pet.stage === 0, "the pet starts hungry");
assert(startView.timeLeft != null && startView.timeLeft > 5, "the pet timer should be live");

const bowl = startView.scene.bowl;
const pet = startView.scene.pet;
assert(Math.hypot(bowl.x - pet.x, bowl.y - pet.y) > 0.3, "bowl and pet sit on opposite sides");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(play.getView().scene.bowl.held === false, "a far pointer should not pick up the bowl");

drainPlay(play, PET_PICKUP_DWELL - 0.12, oneBody({ left_wrist: { x: bowl.x, y: bowl.y, confidence: 1 } }));
assert(play.getView().scene.bowl.held === false, "a short hover should not stick the bowl yet");
assert(play.tick(1 / 60, far) === "playing", "leaving the bowl early is not a fail");

drainPlay(play, PET_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: bowl.x, y: bowl.y, confidence: 1 } }));
const held = play.getView();
assert(held.scene.bowl.held === true, "hovering a wrist for the dwell should stick the bowl");
assert(held.outcome === undefined, "pickup is not a win");
assert(play.tick(1 / 60, oneBody({ left_wrist: { x: bowl.x + 0.08, y: bowl.y - 0.04, confidence: 1 } })) === "playing");
const carried = play.getView().scene.bowl;
assert(Math.abs(carried.x - (bowl.x + 0.08)) < 0.001, "the bowl should follow the attached hand");

const overPet = oneBody({ left_wrist: { x: pet.x, y: pet.y, confidence: 1 } });
drainPlay(play, FEED_DWELL - 0.15, overPet);
assert(play.getView().scene.pet.stage === 0, "a short overlap should not feed the pet yet");
assert(play.getView().scene.feeding === true, "overlap should show the feed cue");

const fed = drainPlay(play, FEED_DWELL, overPet);
assert(fed === "win", "holding the bowl over the pet for the feed dwell should win");
assert(play.getView().scene.pet.stage === 1, "a win should make the pet happy");
assert(play.getView().scene.feeding === true, "the feed cue should still be visible on the win");

const timeoutPlay = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, PET_DURATION + 0.1, far);
assert(timed === "fail", "timeout before a feed should fail");
assert(timeoutPlay.getView().scene.pet.stage === 0, "a timeout should leave the pet hungry");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const missedPickup = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
missedPickup.start();
const missBowl = missedPickup.getView().scene.bowl;
drainPlay(missedPickup, 0.2, oneBody({ pointer: { x: missBowl.x, y: missBowl.y, confidence: 1 } }, "mouse"));
assert(missedPickup.getView().scene.bowl.held === false, "a brief brush is not a pickup");
assert(drainPlay(missedPickup, PET_DURATION, far) === "fail", "never picking up still fails only on timeout");

const solo = FEED_PET.create({ random: () => 0.8, index: 1, duration: FEED_PET.duration });
solo.start();
const soloBowl = solo.getView().scene.bowl;
const soloPet = solo.getView().scene.pet;
drainPlay(solo, PET_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: soloBowl.x, y: soloBowl.y, confidence: 1 } }, "mouse"));
assert(solo.getView().scene.bowl.held === true, "one body / pointer should be able to pick up");
assert(drainPlay(solo, FEED_DWELL + 0.05, oneBody({ pointer: { x: soloPet.x, y: soloPet.y, confidence: 1 } }, "mouse")) === "win");

const duo = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
duo.start();
const duoBowl = duo.getView().scene.bowl;
const duoPet = duo.getView().scene.pet;
const twoFarThenSecondPicks = twoBodies(
  { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
  { right_wrist: { x: duoBowl.x, y: duoBowl.y, confidence: 1 } },
);
assert(duo.tick(1 / 60, twoFarThenSecondPicks) === "playing", "two bodies in one sample stay on the timer");
drainPlay(duo, PET_PICKUP_DWELL + 0.05, twoFarThenSecondPicks);
assert(duo.getView().scene.bowl.held === true, "the second body in the same frame can pick up");
const twoFeed = twoBodies(
  { left_wrist: { x: 0.04, y: 0.96, confidence: 1 } },
  { right_wrist: { x: duoPet.x, y: duoPet.y, confidence: 1 } },
);
assert(drainPlay(duo, FEED_DWELL + 0.05, twoFeed) === "win", "either body can feed; the win is shared");

const firstBody = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
firstBody.start();
const firstBowl = firstBody.getView().scene.bowl;
const firstPet = firstBody.getView().scene.pet;
drainPlay(
  firstBody,
  PET_PICKUP_DWELL + 0.05,
  twoBodies(
    { pointer: { x: firstBowl.x, y: firstBowl.y, confidence: 1 } },
    { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
  ),
);
assert(firstBody.getView().scene.bowl.held === true, "the first body can pick up while a second map is present");
assert(
  drainPlay(
    firstBody,
    FEED_DWELL + 0.05,
    twoBodies(
      { pointer: { x: firstPet.x, y: firstPet.y, confidence: 1 } },
      { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
    ),
  ) === "win",
  "the first body can finish the feed",
);

const session = createGame({ random: () => 0.2, games: 3 });
session.start();
assert(session.getState().prompt === "Water plant", "Play should still flash Water plant first");
assert(session.getState().gameId === "water-plant", "the live game id should open on water-plant");
drainGame(session, PROMPT_DURATION);
drainGame(session, 6, far);
assert(session.getState().result === "fail", "timing out water the plant should still resolve");
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Feed pet", "Play should flash Feed pet as the second game");
assert(session.getState().gameId === "feed-pet", "the live game id should be feed-pet");
assert(session.getState().scene?.kind === "feed-pet", "the pet scene should be on the session view");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to the pet game");
const liveBowl = session.getState().scene.bowl;
const livePet = session.getState().scene.pet;
drainGame(session, PET_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: liveBowl.x, y: liveBowl.y, confidence: 1 } }));
assert(session.getState().scene.bowl.held === true, "session play should stick the bowl");
drainGame(session, FEED_DWELL + 0.05, oneBody({ left_wrist: { x: livePet.x, y: livePet.y, confidence: 1 } }));
assert(session.getState().result === "win", "a feed should resolve as a session win");
assert(session.getState().score === 1, "the session should score the pet win");

const keys = FEED_PET.create({ random: () => 0.2, index: 1, duration: FEED_PET.duration });
keys.start();
const keyBowl = keys.getView().scene.bowl;
const keyPet = keys.getView().scene.pet;
drainPlay(keys, PET_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: keyBowl.x, y: keyBowl.y, confidence: 1 } }, "keyboard"));
assert(
  drainPlay(keys, FEED_DWELL + 0.05, oneBody({ pointer: { x: keyPet.x, y: keyPet.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in should be able to pick and feed",
);

console.log("game/pet.test.mjs passed");
