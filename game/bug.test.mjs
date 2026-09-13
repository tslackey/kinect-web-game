import {
  BUG_DURATION,
  DEFAULT_PACK,
  FOOT_STRIKER_NAMES,
  HIT_RADIUS,
  PLAY_DURATION,
  PROMPT_DURATION,
  RESULT_DURATION,
  STOMP_BUG,
  STOMP_DWELL,
  STRIKER_NAMES,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
  listStrikers,
} from "./index.js";
import { assembleSample } from "../input/poses.js";

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
 * @param {ReturnType<STOMP_BUG.create>} play
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

assert(isMicrogameDef(STOMP_BUG), "stomp the bug must satisfy the microgame contract");
assert(STOMP_BUG.prompt === "Stomp bug", "on-screen prompt is Stomp bug");
assert(STOMP_BUG.prompt.split(/\s+/).length <= 2, "prompt stays at two words");
assert(STOMP_BUG.duration === BUG_DURATION, "pack duration should match the bug timer");
assert(BUG_DURATION >= 15 && BUG_DURATION <= 20, "duration is the 15–20s kids-feel window");
assert(STOMP_DWELL >= 0.3 && STOMP_DWELL <= 0.4, "hover dwell is about 0.35s");
assert(Math.abs(HIT_RADIUS - 0.13) < 1e-9, "hit radius stays ~0.13");
assert(DEFAULT_PACK.some((def) => def.id === "stomp-bug"), "the session pack should include this game");
assert(DEFAULT_PACK.some((def) => def.id === "water-plant"), "water the plant should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "feed-pet"), "feed the pet should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "douse-fire"), "put out the fire should stay in the pack");
assert(DEFAULT_PACK.some((def) => def.id === "orb-hit"), "orb-hit should remain another game in the pack");
assert(DEFAULT_PACK[0].id === "water-plant", "the session pack should still open on water the plant");
assert(DEFAULT_PACK[3].id === "stomp-bug", "stomp the bug is the fourth real microgame");

assert(
  !STRIKER_NAMES.includes("left_ankle") && !STRIKER_NAMES.includes("right_ankle"),
  "ankles must not join the global wrist striker list",
);
assert(
  FOOT_STRIKER_NAMES.includes("left_ankle") && FOOT_STRIKER_NAMES.includes("right_ankle"),
  "this game's strikers are the ankles",
);
assert(FOOT_STRIKER_NAMES.includes("pointer"), "pointer is the camera-off foot stand-in");
assert(
  listStrikers({ left_ankle: { x: 0.2, y: 0.8, confidence: 0.9 } }).length === 0,
  "default listStrikers still ignores ankles",
);
assert(
  listStrikers({ left_ankle: { x: 0.2, y: 0.8, confidence: 0.9 } }, FOOT_STRIKER_NAMES).length === 1,
  "foot names should list an ankle",
);

const play = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "stomp-bug", "the view should expose the bug scene");
assert(startView.scene.bug.stage === 0, "the bug starts alive");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the bug timer should be live");
assert(startView.scene.bug.y >= 0.65, "the bug should sit near the bottom of the field");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(play.getView().scene.bug.stage === 0, "a far pointer should leave the bug alive");

const liveBug = () => play.getView().scene.bug;
const wristOnBug = () => oneBody({ left_wrist: { x: liveBug().x, y: liveBug().y, confidence: 1 } });
assert(play.tick(1 / 60, wristOnBug()) === "playing", "a wrist on the bug is not a stomp");
assert(drainPlay(play, STOMP_DWELL + 0.05, wristOnBug()) === "playing", "hovering a wrist should not squash");

const hoverFoot = () => oneBody({ left_ankle: { x: liveBug().x, y: liveBug().y, confidence: 1 } });
drainPlay(play, STOMP_DWELL - 0.12, hoverFoot());
assert(play.getView().scene.bug.stage === 0, "a short hover should not squash yet");
assert(play.getView().scene.squashing === true, "overlap should show the squash cue");
assert(play.tick(1 / 60, far) === "playing", "leaving the bug early is not a fail");

const hovered = drainPlay(play, STOMP_DWELL + 0.05, hoverFoot());
assert(hovered === "win", "hovering an ankle for the dwell should squash");
assert(play.getView().scene.bug.stage === 1, "a win should squash the bug");
assert(play.getView().scene.squashing === true, "the squash cue should still be visible on the win");

const drivePlay = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
drivePlay.start();
const driveBug = drivePlay.getView().scene.bug;
const startX = Math.max(0, driveBug.x - HIT_RADIUS - 0.04);
assert(
  drivePlay.tick(1 / 60, oneBody({ right_ankle: { x: startX, y: driveBug.y, confidence: 1 } })) === "playing",
  "a foot still outside the bug should not squash",
);
const afterStep = drivePlay.getView().scene.bug;
assert(
  drivePlay.tick(1 / 60, oneBody({ right_ankle: { x: afterStep.x, y: afterStep.y, confidence: 1 } })) === "win",
  "driving an ankle through the bug should squash",
);
assert(drivePlay.getView().scene.bug.stage === 1, "a drive-through should squash the bug");

const timeoutPlay = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, BUG_DURATION + 0.1, far);
assert(timed === "fail", "timeout before a squash should fail");
assert(timeoutPlay.getView().scene.bug.stage === 0, "a timeout should leave the bug alive");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const missedHover = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
missedHover.start();
const missBug = missedHover.getView().scene.bug;
drainPlay(missedHover, 0.15, oneBody({ pointer: { x: missBug.x, y: missBug.y, confidence: 1 } }, "mouse"));
assert(missedHover.getView().scene.bug.stage === 0, "a brief pointer brush is not a squash");
assert(drainPlay(missedHover, BUG_DURATION, far) === "fail", "never stomping still fails only on timeout");

const solo = STOMP_BUG.create({ random: () => 0.8, index: 1, duration: STOMP_BUG.duration });
solo.start();
const soloBug = solo.getView().scene.bug;
assert(
  drainPlay(solo, STOMP_DWELL + 0.05, oneBody({ pointer: { x: soloBug.x, y: soloBug.y, confidence: 1 } }, "mouse")) ===
    "win",
  "one body / pointer-as-foot should be able to squash",
);

const standin = STOMP_BUG.create({ random: () => 0.25, index: 1, duration: STOMP_BUG.duration });
standin.start();
const standinBug = standin.getView().scene.bug;
const mapped = assembleSample({
  pointers: [{ x: standinBug.x, y: standinBug.y, confidence: 1 }],
});
assert(mapped.poses[0].joints.right_ankle.x === standinBug.x, "pointer maps onto a foot stand-in");
assert(mapped.poses[0].joints.pointer.x === standinBug.x, "pointer joint stays the contact point");
assert(drainPlay(standin, STOMP_DWELL + 0.05, mapped) === "win", "assembled pointer-as-foot should squash");

const keys = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
keys.start();
const keyBug = keys.getView().scene.bug;
assert(
  drainPlay(keys, STOMP_DWELL + 0.05, oneBody({ pointer: { x: keyBug.x, y: keyBug.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in should be able to squash",
);

const duo = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
duo.start();
const duoBug = duo.getView().scene.bug;
const twoFarThenSecondStomps = twoBodies(
  { left_ankle: { x: 0.05, y: 0.05, confidence: 1 } },
  { right_ankle: { x: duoBug.x, y: duoBug.y, confidence: 1 } },
);
assert(duo.tick(1 / 60, twoFarThenSecondStomps) === "playing", "two bodies in one sample stay on the timer");
assert(drainPlay(duo, STOMP_DWELL + 0.05, twoFarThenSecondStomps) === "win", "the second body can squash; the win is shared");

const firstBody = STOMP_BUG.create({ random: () => 0.2, index: 1, duration: STOMP_BUG.duration });
firstBody.start();
const firstBug = firstBody.getView().scene.bug;
assert(
  drainPlay(
    firstBody,
    STOMP_DWELL + 0.05,
    twoBodies(
      { pointer: { x: firstBug.x, y: firstBug.y, confidence: 1 } },
      { left_ankle: { x: 0.98, y: 0.08, confidence: 1 } },
    ),
  ) === "win",
  "the first body can squash while a second map is present",
);

const session = createGame({ random: () => 0.2, games: 4 });
session.start();
assert(session.getState().prompt === "Water plant", "Play should still flash Water plant first");
drainGame(session, PROMPT_DURATION);
drainGame(session, PLAY_DURATION + 0.1, far);
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Feed pet", "Play should flash Feed pet as the second game");
drainGame(session, PROMPT_DURATION);
drainGame(session, PLAY_DURATION + 0.1, far);
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Douse fire", "Play should flash Douse fire as the third game");
drainGame(session, PROMPT_DURATION);
drainGame(session, PLAY_DURATION + 0.1, far);
drainGame(session, RESULT_DURATION);
assert(session.getState().prompt === "Stomp bug", "Play should flash Stomp bug as the fourth game");
assert(session.getState().gameId === "stomp-bug", "the live game id should be stomp-bug");
assert(session.getState().scene?.kind === "stomp-bug", "the bug scene should be on the session view");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to the bug game");
const sessionBug = session.getState().scene.bug;
drainGame(session, STOMP_DWELL + 0.05, oneBody({ left_ankle: { x: sessionBug.x, y: sessionBug.y, confidence: 1 } }));
assert(session.getState().result === "win", "a stomp should resolve as a session win");
assert(session.getState().score === 1, "the session should score the bug win");

console.log("game/bug.test.mjs passed");
