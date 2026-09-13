import {
  DEFAULT_CURTAIN_TIMINGS,
  DEFAULT_PACK,
  DOUSE_DWELL,
  DOUSE_FIRE,
  FIRE_DURATION,
  FIRE_PICKUP_DWELL,
  PLAY_DURATION,
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
 * @param {ReturnType<DOUSE_FIRE.create>} play
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

assert(isMicrogameDef(DOUSE_FIRE), "put out the fire must satisfy the microgame contract");
assert(DOUSE_FIRE.prompt === "Douse fire", "on-screen prompt is Douse fire");
assert(DOUSE_FIRE.prompt.split(/\s+/).length <= 2, "prompt stays at two words");
assert(DOUSE_FIRE.duration === FIRE_DURATION, "pack duration should match the fire timer");
assert(FIRE_DURATION >= 15 && FIRE_DURATION <= 20, "duration is the 15–20s kids-feel window");
assert(DEFAULT_PACK.some((def) => def.id === "douse-fire"), "the session pack should include this game");
assert(DEFAULT_PACK.some((def) => def.id === "water-plant"), "water the plant should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "feed-pet"), "feed the pet should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "stomp-bug"), "stomp the bug should join the pack");
assert(DEFAULT_PACK.some((def) => def.id === "orb-hit"), "orb-hit should remain another game in the pack");
assert(DEFAULT_PACK[0].id === "water-plant", "the session pack should still open on water the plant");
assert(DEFAULT_PACK[1].id === "feed-pet", "feed the pet stays the second real microgame");
assert(DEFAULT_PACK[2].id === "douse-fire", "put out the fire is the third real microgame");

const play = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "douse-fire", "the view should expose the fire scene");
assert(startView.scene.bucket.held === false, "the bucket starts on the field");
assert(startView.scene.fire.stage === 0, "the fire starts burning");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the fire timer should be live");

const bucket = startView.scene.bucket;
const fire = startView.scene.fire;
assert(Math.hypot(bucket.x - fire.x, bucket.y - fire.y) > 0.3, "bucket and fire sit on opposite sides");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(play.getView().scene.bucket.held === false, "a far pointer should not pick up the bucket");

drainPlay(play, FIRE_PICKUP_DWELL - 0.12, oneBody({ left_wrist: { x: bucket.x, y: bucket.y, confidence: 1 } }));
assert(play.getView().scene.bucket.held === false, "a short hover should not stick the bucket yet");
assert(play.tick(1 / 60, far) === "playing", "leaving the bucket early is not a fail");

drainPlay(play, FIRE_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: bucket.x, y: bucket.y, confidence: 1 } }));
const held = play.getView();
assert(held.scene.bucket.held === true, "hovering a wrist for the dwell should stick the bucket");
assert(held.outcome === undefined, "pickup is not a win");
assert(play.tick(1 / 60, oneBody({ left_wrist: { x: bucket.x + 0.08, y: bucket.y - 0.04, confidence: 1 } })) === "playing");
const carried = play.getView().scene.bucket;
assert(Math.abs(carried.x - (bucket.x + 0.08)) < 0.001, "the bucket should follow the attached hand");

const overFire = oneBody({ left_wrist: { x: fire.x, y: fire.y, confidence: 1 } });
drainPlay(play, DOUSE_DWELL - 0.15, overFire);
assert(play.getView().scene.fire.stage === 0, "a short overlap should not put the fire out yet");
assert(play.getView().scene.dousing === true, "overlap should show the spray cue");

const doused = drainPlay(play, DOUSE_DWELL, overFire);
assert(doused === "win", "holding the bucket over the fire for the douse dwell should win");
assert(play.getView().scene.fire.stage === 1, "a win should extinguish the fire");
assert(play.getView().scene.dousing === true, "the spray cue should still be visible on the win");

const timeoutPlay = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, FIRE_DURATION + 0.1, far);
assert(timed === "fail", "timeout before a douse should fail");
assert(timeoutPlay.getView().scene.fire.stage === 0, "a timeout should leave the fire burning");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const missedPickup = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
missedPickup.start();
const missBucket = missedPickup.getView().scene.bucket;
drainPlay(missedPickup, 0.2, oneBody({ pointer: { x: missBucket.x, y: missBucket.y, confidence: 1 } }, "mouse"));
assert(missedPickup.getView().scene.bucket.held === false, "a brief brush is not a pickup");
assert(drainPlay(missedPickup, FIRE_DURATION, far) === "fail", "never picking up still fails only on timeout");

const solo = DOUSE_FIRE.create({ random: () => 0.8, index: 1, duration: DOUSE_FIRE.duration });
solo.start();
const soloBucket = solo.getView().scene.bucket;
const soloFire = solo.getView().scene.fire;
drainPlay(solo, FIRE_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: soloBucket.x, y: soloBucket.y, confidence: 1 } }, "mouse"));
assert(solo.getView().scene.bucket.held === true, "one body / pointer should be able to pick up");
assert(drainPlay(solo, DOUSE_DWELL + 0.05, oneBody({ pointer: { x: soloFire.x, y: soloFire.y, confidence: 1 } }, "mouse")) === "win");

const duo = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
duo.start();
const duoBucket = duo.getView().scene.bucket;
const duoFire = duo.getView().scene.fire;
const twoFarThenSecondPicks = twoBodies(
  { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
  { right_wrist: { x: duoBucket.x, y: duoBucket.y, confidence: 1 } },
);
assert(duo.tick(1 / 60, twoFarThenSecondPicks) === "playing", "two bodies in one sample stay on the timer");
drainPlay(duo, FIRE_PICKUP_DWELL + 0.05, twoFarThenSecondPicks);
assert(duo.getView().scene.bucket.held === true, "the second body in the same frame can pick up");
const twoDouse = twoBodies(
  { left_wrist: { x: 0.04, y: 0.96, confidence: 1 } },
  { right_wrist: { x: duoFire.x, y: duoFire.y, confidence: 1 } },
);
assert(drainPlay(duo, DOUSE_DWELL + 0.05, twoDouse) === "win", "either body can douse; the win is shared");

const firstBody = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
firstBody.start();
const firstBucket = firstBody.getView().scene.bucket;
const firstFire = firstBody.getView().scene.fire;
drainPlay(
  firstBody,
  FIRE_PICKUP_DWELL + 0.05,
  twoBodies(
    { pointer: { x: firstBucket.x, y: firstBucket.y, confidence: 1 } },
    { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
  ),
);
assert(firstBody.getView().scene.bucket.held === true, "the first body can pick up while a second map is present");
assert(
  drainPlay(
    firstBody,
    DOUSE_DWELL + 0.05,
    twoBodies(
      { pointer: { x: firstFire.x, y: firstFire.y, confidence: 1 } },
      { left_wrist: { x: 0.98, y: 0.08, confidence: 1 } },
    ),
  ) === "win",
  "the first body can finish the douse",
);

const session = createGame({ random: () => 0.2, games: 3, shuffle: false });
session.start();
assert(session.getState().prompt === "Water plant", "Play should still flash Water plant first");
assert(session.getState().gameId === "water-plant", "the live game id should open on water-plant");
drainGame(session, PROMPT_DURATION);
drainGame(session, PLAY_DURATION + 0.1, far);
assert(session.getState().result === "fail", "timing out water the plant should still resolve");
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Feed pet", "Play should flash Feed pet as the second game");
drainGame(session, PROMPT_DURATION);
drainGame(session, PLAY_DURATION + 0.1, far);
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Douse fire", "Play should flash Douse fire as the third game");
drainGame(session, DEFAULT_CURTAIN_TIMINGS.down + DEFAULT_CURTAIN_TIMINGS.covered);
assert(session.getState().gameId === "douse-fire", "the live game id should be douse-fire");
assert(session.getState().scene?.kind === "douse-fire", "the fire scene should be on the session view");
drainGame(session, DEFAULT_CURTAIN_TIMINGS.up + DEFAULT_CURTAIN_TIMINGS.hold);
assert(session.getState().phase === "playing", "the prompt should hand off to the fire game");
const liveBucket = session.getState().scene.bucket;
const liveFire = session.getState().scene.fire;
drainGame(session, FIRE_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: liveBucket.x, y: liveBucket.y, confidence: 1 } }));
assert(session.getState().scene.bucket.held === true, "session play should stick the bucket");
drainGame(session, DOUSE_DWELL + 0.05, oneBody({ left_wrist: { x: liveFire.x, y: liveFire.y, confidence: 1 } }));
assert(session.getState().result === "win", "a douse should resolve as a session win");
assert(session.getState().score === 1, "the session should score the fire win");

const keys = DOUSE_FIRE.create({ random: () => 0.2, index: 1, duration: DOUSE_FIRE.duration });
keys.start();
const keyBucket = keys.getView().scene.bucket;
const keyFire = keys.getView().scene.fire;
drainPlay(keys, FIRE_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: keyBucket.x, y: keyBucket.y, confidence: 1 } }, "keyboard"));
assert(
  drainPlay(keys, DOUSE_DWELL + 0.05, oneBody({ pointer: { x: keyFire.x, y: keyFire.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in should be able to pick and douse",
);

console.log("game/fire.test.mjs passed");
