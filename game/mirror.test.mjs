import {
  DEFAULT_PACK,
  MIRROR_DWELL,
  MIRROR_DURATION,
  MIRROR_ME,
  PLAY_DURATION,
  PROMPT_DURATION,
  createGame,
  isMicrogameDef,
  isPlayOutcome,
} from "./index.js";
import { assembleSample } from "../input/poses.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle() {
  return { source: "idle", poses: [], timestamp: 0 };
}

function oneBody(joints, source = "webcam") {
  return { source, poses: [{ id: "p1", source, joints }], timestamp: 0 };
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
 * @param {ReturnType<MIRROR_ME.create>} play
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

function arms(originX, originY, leftDx, leftDy, rightDx, rightDy) {
  return {
    nose: { x: originX, y: originY, confidence: 1 },
    left_shoulder: { x: originX - 0.06, y: originY + 0.08, confidence: 1 },
    right_shoulder: { x: originX + 0.06, y: originY + 0.08, confidence: 1 },
    left_wrist: { x: originX + leftDx, y: originY + leftDy, confidence: 1 },
    right_wrist: { x: originX + rightDx, y: originY + rightDy, confidence: 1 },
  };
}

assert(isMicrogameDef(MIRROR_ME), "mirror me must satisfy the microgame contract");
assert(MIRROR_ME.prompt === "Copy!", "on-screen prompt is Copy!");
assert(MIRROR_ME.duration === MIRROR_DURATION, "pack duration should match the mirror timer");
assert(MIRROR_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(MIRROR_DWELL === 0.5, "copy hold is about half a second");
assert(DEFAULT_PACK.some((def) => def.id === "mirror-me"), "mirror me joins the session pack");

const play = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "mirror-me", "the view should expose the mirror scene");
assert(startView.scene.mode === "solo", "one body starts on the ghost fallback");
assert(startView.scene.matched === false, "copy starts unmatched");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the mirror timer should be live");

const far = oneBody({ nose: { x: 0.5, y: 0.32, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");

const ghost = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
ghost.start();
const left = ghost.getView().scene.left;
const right = ghost.getView().scene.right;
assert(
  drainPlay(ghost, MIRROR_DWELL + 0.05, oneBody({ pointer: { x: left.x, y: left.y, confidence: 1 } }, "mouse")) ===
    "playing",
  "one ghost anchor is not yet a copy",
);
assert(
  drainPlay(ghost, MIRROR_DWELL + 0.05, oneBody({ pointer: { x: right.x, y: right.y, confidence: 1 } }, "mouse")) ===
    "win",
  "pointer can hold each ghost anchor in turn when the camera is off",
);

const both = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
both.start();
assert(
  drainPlay(
    both,
    MIRROR_DWELL + 0.05,
    oneBody({
      left_wrist: { x: left.x, y: left.y, confidence: 1 },
      right_wrist: { x: right.x, y: right.y, confidence: 1 },
    }),
  ) === "win",
  "solo both wrists on the ghost anchors wins",
);

const duo = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
duo.start();
const copied = twoBodies(
  arms(0.28, 0.36, -0.12, 0.16, 0.14, -0.1),
  arms(0.7, 0.4, -0.11, 0.15, 0.13, -0.09),
);
assert(duo.tick(1 / 60, copied) === "playing", "a brief match is not yet a win");
assert(duo.getView().scene.mode === "duo", "two bodies switch off the ghost");
assert(drainPlay(duo, MIRROR_DWELL + 0.05, copied) === "win", "P2 matching P1 wrists for the dwell wins");
assert(duo.getView().scene.matched === true, "a duo win flags matched");

const mismatch = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
mismatch.start();
const uncopied = twoBodies(
  arms(0.28, 0.36, -0.12, 0.16, 0.14, -0.1),
  arms(0.7, 0.4, 0.16, -0.14, -0.14, 0.18),
);
assert(drainPlay(mismatch, MIRROR_DWELL + 0.1, uncopied) === "playing", "opposite wrists are not a copy");
assert(mismatch.getView().scene.mode === "duo", "mismatch still stays in duo mode");

const timeoutPlay = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
timeoutPlay.start();
assert(drainPlay(timeoutPlay, MIRROR_DURATION + 0.1, far) === "fail", "timeout before a copy should fail");

const pointers = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
pointers.start();
const standins = assembleSample({
  pointers: [
    { x: 0.3, y: 0.42, confidence: 1 },
    { x: 0.72, y: 0.4, confidence: 1 },
  ],
});
assert(standins.poses.length === 2, "two pointers are two pose maps when the camera is off");
const pointerDuo = drainPlay(pointers, MIRROR_DWELL + 0.05, standins);
assert(pointerDuo === "win" || pointers.getView().scene.mode === "duo", "pointer can stand in as the missing second body");
if (pointerDuo !== "win") {
  const p1 = standins.poses[0].joints;
  const copyP1 = {
    nose: { ...p1.nose },
    left_shoulder: { ...p1.left_shoulder },
    right_shoulder: { ...p1.right_shoulder },
    left_wrist: { x: p1.left_wrist.x + 0.4, y: p1.left_wrist.y, confidence: 1 },
    right_wrist: { x: p1.right_wrist.x + 0.4, y: p1.right_wrist.y, confidence: 1 },
  };
  const aligned = twoBodies(p1, copyP1, "mouse");
  assert(drainPlay(pointers, MIRROR_DWELL + 0.05, aligned) === "win", "aligned pointer maps can still copy");
}

const keys = MIRROR_ME.create({ random: () => 0.2, index: 1, duration: MIRROR_ME.duration });
keys.start();
assert(
  drainPlay(keys, MIRROR_DWELL + 0.05, oneBody({ pointer: { x: left.x, y: left.y, confidence: 1 } }, "keyboard")) ===
    "playing",
  "keyboard hits the first ghost mark",
);
assert(
  drainPlay(keys, MIRROR_DWELL + 0.05, oneBody({ pointer: { x: right.x, y: right.y, confidence: 1 } }, "keyboard")) ===
    "win",
  "keyboard stand-in can finish the ghost fallback",
);

const clipped = createGame({
  random: () => 0.2,
  games: 1,
  shuffle: false,
  pack: [MIRROR_ME],
  playerMode: "1p",
});
clipped.start();
drainGame(clipped, PROMPT_DURATION);
assert(clipped.getState().scene.mode === "solo", "1P clips to one body so the ghost fallback is live");
drainGame(
  clipped,
  MIRROR_DWELL + 0.05,
  twoBodies(
    {
      left_wrist: { x: left.x, y: left.y, confidence: 1 },
      right_wrist: { x: right.x, y: right.y, confidence: 1 },
    },
    arms(0.7, 0.4, 0.2, 0.2, -0.2, -0.2),
  ),
);
assert(clipped.getState().result === "win", "1P still wins on the ghost even if a second body is in the raw sample");

const session = createGame({
  random: () => 0.2,
  games: 1,
  shuffle: false,
  pack: [MIRROR_ME],
});
session.start();
assert(session.getState().prompt === "Copy!", "Play should flash Copy!");
assert(session.getState().gameId === "mirror-me", "the live game id should be mirror-me");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to mirror me");
drainGame(session, MIRROR_DWELL + 0.05, copied);
assert(session.getState().result === "win", "a duo copy should resolve as a session win");
assert(session.getState().score === 1, "the session should score the mirror win");

console.log("game/mirror.test.mjs passed");
