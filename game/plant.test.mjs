import {
  DEFAULT_PACK,
  PICKUP_DWELL,
  PLANT_DURATION,
  POUR_DWELL,
  PROMPT_DURATION,
  WATER_PLANT,
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
 * @param {ReturnType<WATER_PLANT.create>} play
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

assert(isMicrogameDef(WATER_PLANT), "water the plant must satisfy the microgame contract");
assert(WATER_PLANT.prompt === "Water plant", "on-screen prompt is Water plant");
assert(WATER_PLANT.prompt.split(/\s+/).length <= 2, "prompt stays at two words");
assert(WATER_PLANT.duration === PLANT_DURATION, "pack duration should match the plant timer");
assert(PLANT_DURATION >= 15 && PLANT_DURATION <= 20, "duration is the 15–20s kids-feel window");
assert(DEFAULT_PACK[0].id === "water-plant", "the session pack should open on this game");
assert(DEFAULT_PACK.some((def) => def.id === "feed-pet"), "feed the pet should join the pack");
assert(DEFAULT_PACK.some((def) => def.id === "douse-fire"), "put out the fire should join the pack");
assert(DEFAULT_PACK.some((def) => def.id === "stomp-bug"), "stomp the bug should join the pack");
assert(DEFAULT_PACK.some((def) => def.id === "orb-hit"), "orb-hit should remain another game in the pack");

const play = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "water-plant", "the view should expose the plant scene");
assert(startView.scene.pot.held === false, "the pot starts on the field");
assert(startView.scene.pot.offered === false, "the pot is not offered at rest");
assert(startView.scene.plant.stage === 0, "the plant starts small");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the plant timer should be live");

const pot = startView.scene.pot;
const plant = startView.scene.plant;
assert(Math.hypot(pot.x - plant.x, pot.y - plant.y) > 0.3, "pot and plant sit on opposite sides");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(play.getView().scene.pot.held === false, "a far pointer should not pick up the pot");

drainPlay(play, PICKUP_DWELL - 0.12, oneBody({ left_wrist: { x: pot.x, y: pot.y, confidence: 1 } }));
assert(play.getView().scene.pot.held === false, "a short hover should not stick the pot yet");
assert(play.tick(1 / 60, far) === "playing", "leaving the pot early is not a fail");

drainPlay(play, PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: pot.x, y: pot.y, confidence: 1 } }));
const held = play.getView();
assert(held.scene.pot.held === true, "hovering a wrist for the dwell should stick the pot");
assert(held.outcome === undefined, "pickup is not a win");
assert(play.tick(1 / 60, oneBody({ left_wrist: { x: pot.x + 0.08, y: pot.y - 0.04, confidence: 1 } })) === "playing");
const carried = play.getView().scene.pot;
assert(Math.abs(carried.x - (pot.x + 0.08)) < 0.001, "the pot should follow the attached hand");

const overPlant = oneBody({ left_wrist: { x: plant.x, y: plant.y, confidence: 1 } });
drainPlay(play, POUR_DWELL - 0.15, overPlant);
assert(play.getView().scene.plant.stage === 0, "a short overlap should not grow the plant yet");
assert(play.getView().scene.pouring === true, "overlap should show the pour cue");

const poured = drainPlay(play, POUR_DWELL, overPlant);
assert(poured === "win", "holding the pot over the plant for the pour dwell should win");
assert(play.getView().scene.plant.stage === 1, "a win should grow the plant one stage");
assert(play.getView().scene.pouring === true, "the pour cue should still be visible on the win");

const timeoutPlay = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, PLANT_DURATION + 0.1, far);
assert(timed === "fail", "timeout before a pour should fail");
assert(timeoutPlay.getView().scene.plant.stage === 0, "a timeout should leave the plant small");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const missedPickup = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
missedPickup.start();
const missPot = missedPickup.getView().scene.pot;
drainPlay(missedPickup, 0.2, oneBody({ pointer: { x: missPot.x, y: missPot.y, confidence: 1 } }, "mouse"));
assert(missedPickup.getView().scene.pot.held === false, "a brief brush is not a pickup");
assert(drainPlay(missedPickup, PLANT_DURATION, far) === "fail", "never picking up still fails only on timeout");

const solo = WATER_PLANT.create({ random: () => 0.8, index: 1, duration: WATER_PLANT.duration });
solo.start();
const soloPot = solo.getView().scene.pot;
const soloPlant = solo.getView().scene.plant;
drainPlay(solo, PICKUP_DWELL + 0.05, oneBody({ pointer: { x: soloPot.x, y: soloPot.y, confidence: 1 } }, "mouse"));
assert(solo.getView().scene.pot.held === true, "one body / pointer should be able to pick up");
assert(drainPlay(solo, POUR_DWELL + 0.05, oneBody({ pointer: { x: soloPlant.x, y: soloPlant.y, confidence: 1 } }, "mouse")) === "win");

const duo = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
duo.start();
const duoPot = duo.getView().scene.pot;
const duoPlant = duo.getView().scene.plant;
const twoFarThenSecondPicks = twoBodies(
  { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
  { right_wrist: { x: duoPot.x, y: duoPot.y, confidence: 1 } },
);
assert(duo.tick(1 / 60, twoFarThenSecondPicks) === "playing", "two bodies in one sample stay on the timer");
drainPlay(duo, PICKUP_DWELL + 0.05, twoFarThenSecondPicks);
assert(duo.getView().scene.pot.held === true, "the second body in the same frame can pick up");
const twoPour = twoBodies(
  { left_wrist: { x: 0.04, y: 0.96, confidence: 1 } },
  { right_wrist: { x: duoPlant.x, y: duoPlant.y, confidence: 1 } },
);
assert(drainPlay(duo, POUR_DWELL + 0.05, twoPour) === "win", "either body can pour; the win is shared");

const firstBody = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
firstBody.start();
const firstPot = firstBody.getView().scene.pot;
const firstPlant = firstBody.getView().scene.plant;
drainPlay(
  firstBody,
  PICKUP_DWELL + 0.05,
  twoBodies(
    { pointer: { x: firstPot.x, y: firstPot.y, confidence: 1 } },
    { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
  ),
);
assert(firstBody.getView().scene.pot.held === true, "the first body can pick up while a second map is present");
assert(
  drainPlay(
    firstBody,
    POUR_DWELL + 0.05,
    twoBodies(
      { pointer: { x: firstPlant.x, y: firstPlant.y, confidence: 1 } },
      { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
    ),
  ) === "win",
  "the first body can finish the pour",
);

const session = createGame({ random: () => 0.2, games: 2, shuffle: false });
session.start();
assert(session.getState().prompt === "Water plant", "Play should flash Water plant");
assert(session.getState().gameId === "water-plant", "the live game id should be water-plant");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to the plant game");
const livePot = session.getState().scene.pot;
const livePlant = session.getState().scene.plant;
drainGame(session, PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: livePot.x, y: livePot.y, confidence: 1 } }));
assert(session.getState().scene.pot.held === true, "session play should stick the pot");
drainGame(session, POUR_DWELL + 0.05, oneBody({ left_wrist: { x: livePlant.x, y: livePlant.y, confidence: 1 } }));
assert(session.getState().result === "win", "a pour should resolve as a session win");
assert(session.getState().score === 1, "the session should score the plant win");

const noSteal = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
noSteal.start();
const stealPot = noSteal.getView().scene.pot;
drainPlay(noSteal, PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: stealPot.x, y: stealPot.y, confidence: 1 } }));
assert(noSteal.getView().scene.pot.heldBy === "p1:left_wrist", "first wrist owns the pot");
assert(noSteal.getView().scene.pot.offered === false, "one hand is not an offer");
noSteal.tick(
  1 / 60,
  twoBodies(
    { left_wrist: { x: 0.42, y: 0.5, confidence: 1 } },
    { right_wrist: { x: 0.42, y: 0.5, confidence: 1 } },
  ),
);
assert(noSteal.getView().scene.pot.heldBy === "p1:left_wrist", "a second body cannot steal without an offer");
assert(noSteal.getView().scene.pot.offered === false, "a thief hand does not offer the pot");

const passPlay = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
passPlay.start();
const passPot = passPlay.getView().scene.pot;
const passPlant = passPlay.getView().scene.plant;
drainPlay(passPlay, PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: passPot.x, y: passPot.y, confidence: 1 } }));
passPlay.tick(
  1 / 60,
  oneBody({
    left_wrist: { x: 0.5, y: 0.5, confidence: 1 },
    right_wrist: { x: 0.5, y: 0.5, confidence: 1 },
  }),
);
assert(passPlay.getView().scene.pot.offered === true, "both owner hands latch the offered cue");
assert(passPlay.getView().scene.pot.heldBy === "p1:left_wrist", "the offering hand does not instantly take the pot");
passPlay.tick(
  1 / 60,
  twoBodies(
    {
      left_wrist: { x: 0.5, y: 0.5, confidence: 1 },
      right_wrist: { x: 0.5, y: 0.5, confidence: 1 },
    },
    { left_wrist: { x: 0.5, y: 0.5, confidence: 1 } },
  ),
);
assert(passPlay.getView().scene.pot.heldBy === "p2:left_wrist", "one hand from the other body accepts");
assert(passPlay.getView().scene.pot.offered === false, "accept clears the offer");
assert(
  drainPlay(
    passPlay,
    POUR_DWELL + 0.05,
    twoBodies(
      { left_wrist: { x: 0.04, y: 0.96, confidence: 1 } },
      { left_wrist: { x: passPlant.x, y: passPlant.y, confidence: 1 } },
    ),
  ) === "win",
  "the new owner can still pour",
);

const swapPlay = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
swapPlay.start();
const swapPot = swapPlay.getView().scene.pot;
const swapPlant = swapPlay.getView().scene.plant;
drainPlay(swapPlay, PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: swapPot.x, y: swapPot.y, confidence: 1 } }));
swapPlay.tick(
  1 / 60,
  oneBody({
    left_wrist: { x: 0.48, y: 0.52, confidence: 1 },
    right_wrist: { x: 0.48, y: 0.52, confidence: 1 },
  }),
);
assert(swapPlay.getView().scene.pot.offered === true, "same-body two-hand contact offers");
swapPlay.tick(1 / 60, oneBody({ left_wrist: { x: 0.48, y: 0.52, confidence: 1 } }));
swapPlay.tick(
  1 / 60,
  oneBody({
    left_wrist: { x: 0.48, y: 0.52, confidence: 1 },
    right_wrist: { x: 0.48, y: 0.52, confidence: 1 },
  }),
);
assert(swapPlay.getView().scene.pot.heldBy === "p1:right_wrist", "re-grab with the other hand swaps on the same body");
assert(
  drainPlay(swapPlay, POUR_DWELL + 0.05, oneBody({ right_wrist: { x: swapPlant.x, y: swapPlant.y, confidence: 1 } })) ===
    "win",
  "the swapped hand can still pour",
);

const keys = WATER_PLANT.create({ random: () => 0.2, index: 1, duration: WATER_PLANT.duration });
keys.start();
const keyPot = keys.getView().scene.pot;
const keyPlant = keys.getView().scene.plant;
drainPlay(keys, PICKUP_DWELL + 0.05, oneBody({ pointer: { x: keyPot.x, y: keyPot.y, confidence: 1 } }, "keyboard"));
assert(
  drainPlay(keys, POUR_DWELL + 0.05, oneBody({ pointer: { x: keyPlant.x, y: keyPlant.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in should be able to pick and pour",
);

console.log("game/plant.test.mjs passed");
