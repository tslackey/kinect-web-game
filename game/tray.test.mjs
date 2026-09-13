import {
  BALANCE_TRAY,
  DEFAULT_PACK,
  PLAY_DURATION,
  PROMPT_DURATION,
  TRAY_ARRIVE_DWELL,
  TRAY_DURATION,
  TRAY_PICKUP_DWELL,
  TRAY_TIP_GRACE,
  TRAY_TIP_Y,
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
 * @param {ReturnType<BALANCE_TRAY.create>} play
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

assert(isMicrogameDef(BALANCE_TRAY), "balance the tray must satisfy the microgame contract");
assert(BALANCE_TRAY.prompt === "Steady!", "on-screen prompt is Steady!");
assert(BALANCE_TRAY.duration === TRAY_DURATION, "pack duration should match the tray timer");
assert(TRAY_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(TRAY_DURATION >= 15 && TRAY_DURATION <= 20, "duration stays in the kids-feel window");
assert(TRAY_TIP_Y > 0 && TRAY_TIP_Y < 0.3, "tip tolerance is a small wrist Y delta");
assert(DEFAULT_PACK.some((def) => def.id === "balance-tray"), "balance the tray joins the session pack");

const play = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "balance-tray", "the view should expose the tray scene");
assert(startView.scene.tray.held === false, "the tray starts on the field");
assert(startView.scene.tray.tipped === false, "the tray starts level");
assert(startView.scene.arriving === false, "arrival starts cold");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the tray timer should be live");

const tray = startView.scene.tray;
const goal = startView.scene.goal;
assert(Math.hypot(tray.x - goal.x, tray.y - goal.y) > 0.3, "tray and goal sit on opposite sides");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(play.getView().scene.tray.held === false, "a far pointer should not pick up the tray");

drainPlay(play, TRAY_PICKUP_DWELL - 0.12, oneBody({ left_wrist: { x: tray.x, y: tray.y, confidence: 1 } }));
assert(play.getView().scene.tray.held === false, "a short hover should not stick the tray yet");

drainPlay(play, TRAY_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: tray.x, y: tray.y, confidence: 1 } }));
const held = play.getView();
assert(held.scene.tray.held === true, "hovering a wrist for the dwell should stick the tray");
assert(
  play.tick(1 / 60, oneBody({ left_wrist: { x: tray.x + 0.08, y: tray.y - 0.04, confidence: 1 } })) === "playing",
);
const carried = play.getView().scene.tray;
assert(Math.abs(carried.x - (tray.x + 0.08)) < 0.001, "the tray should follow the attached hand");

const overGoal = oneBody({ left_wrist: { x: goal.x, y: goal.y, confidence: 1 } });
drainPlay(play, TRAY_ARRIVE_DWELL - 0.15, overGoal);
assert(play.getView().scene.arriving === true, "overlap should show the arrive cue");
assert(play.tick(1 / 60, overGoal) === "playing", "a short overlap is not yet a win");

const arrived = drainPlay(play, TRAY_ARRIVE_DWELL, overGoal);
assert(arrived === "win", "holding a level tray on the goal for the dwell should win");

const timeoutPlay = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, TRAY_DURATION + 0.1, far);
assert(timed === "fail", "timeout before arriving should fail");
assert(timeoutPlay.getView().scene.tray.tipped === false, "a timeout fail is not a tip");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const tipPlay = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
tipPlay.start();
const tipTray = tipPlay.getView().scene.tray;
drainPlay(tipPlay, TRAY_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: tipTray.x, y: tipTray.y, confidence: 1 } }));
assert(tipPlay.getView().scene.tray.held === true, "tip play starts held");
drainPlay(
  tipPlay,
  TRAY_TIP_GRACE + 0.05,
  oneBody({
    left_wrist: { x: 0.4, y: 0.4, confidence: 1 },
    right_wrist: { x: 0.5, y: 0.4 + TRAY_TIP_Y + 0.05, confidence: 1 },
  }),
);
assert(tipPlay.tick(1 / 60, far) === "fail", "tip beyond tolerance is an early fail");
assert(tipPlay.getView().scene.tray.tipped === true, "a tip fail flags the tray");

const levelCarry = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
levelCarry.start();
const levelTray = levelCarry.getView().scene.tray;
const levelGoal = levelCarry.getView().scene.goal;
drainPlay(
  levelCarry,
  TRAY_PICKUP_DWELL + 0.05,
  oneBody({
    left_wrist: { x: levelTray.x, y: levelTray.y, confidence: 1 },
    right_wrist: { x: levelTray.x + 0.04, y: levelTray.y, confidence: 1 },
  }),
);
assert(levelCarry.getView().scene.tray.held === true, "two level wrists still pick up");
assert(
  drainPlay(
    levelCarry,
    TRAY_ARRIVE_DWELL + 0.05,
    oneBody({
      left_wrist: { x: levelGoal.x - 0.03, y: levelGoal.y, confidence: 1 },
      right_wrist: { x: levelGoal.x + 0.03, y: levelGoal.y, confidence: 1 },
    }),
  ) === "win",
  "level two-hand carry to the goal wins",
);

const solo = BALANCE_TRAY.create({ random: () => 0.8, index: 1, duration: BALANCE_TRAY.duration });
solo.start();
const soloTray = solo.getView().scene.tray;
const soloGoal = solo.getView().scene.goal;
drainPlay(solo, TRAY_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: soloTray.x, y: soloTray.y, confidence: 1 } }, "mouse"));
assert(solo.getView().scene.tray.held === true, "one body / pointer should be able to pick up");
assert(
  drainPlay(solo, TRAY_ARRIVE_DWELL + 0.05, oneBody({ pointer: { x: soloGoal.x, y: soloGoal.y, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can finish a level carry when the camera is off",
);

const duo = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
duo.start();
const duoTray = duo.getView().scene.tray;
const duoGoal = duo.getView().scene.goal;
const twoFarThenSecondPicks = twoBodies(
  { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
  { right_wrist: { x: duoTray.x, y: duoTray.y, confidence: 1 } },
);
drainPlay(duo, TRAY_PICKUP_DWELL + 0.05, twoFarThenSecondPicks);
assert(duo.getView().scene.tray.held === true, "the second body in the same frame can pick up");
const twoArrive = twoBodies(
  { left_wrist: { x: 0.04, y: 0.96, confidence: 1 } },
  { right_wrist: { x: duoGoal.x, y: duoGoal.y, confidence: 1 } },
);
assert(drainPlay(duo, TRAY_ARRIVE_DWELL + 0.05, twoArrive) === "win", "either body can arrive; the win is shared");

const keys = BALANCE_TRAY.create({ random: () => 0.2, index: 1, duration: BALANCE_TRAY.duration });
keys.start();
const keyTray = keys.getView().scene.tray;
const keyGoal = keys.getView().scene.goal;
drainPlay(keys, TRAY_PICKUP_DWELL + 0.05, oneBody({ pointer: { x: keyTray.x, y: keyTray.y, confidence: 1 } }, "keyboard"));
assert(
  drainPlay(keys, TRAY_ARRIVE_DWELL + 0.05, oneBody({ pointer: { x: keyGoal.x, y: keyGoal.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in should be able to pick and arrive",
);

const session = createGame({
  random: () => 0.2,
  games: 1,
  shuffle: false,
  pack: [BALANCE_TRAY],
});
session.start();
assert(session.getState().prompt === "Steady!", "Play should flash Steady!");
assert(session.getState().gameId === "balance-tray", "the live game id should be balance-tray");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to the tray game");
const liveTray = session.getState().scene.tray;
const liveGoal = session.getState().scene.goal;
drainGame(session, TRAY_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: liveTray.x, y: liveTray.y, confidence: 1 } }));
assert(session.getState().scene.tray.held === true, "session play should stick the tray");
drainGame(session, TRAY_ARRIVE_DWELL + 0.05, oneBody({ left_wrist: { x: liveGoal.x, y: liveGoal.y, confidence: 1 } }));
assert(session.getState().result === "win", "an arrive should resolve as a session win");
assert(session.getState().score === 1, "the session should score the tray win");

console.log("game/tray.test.mjs passed");
