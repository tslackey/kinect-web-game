import {
  DEFAULT_PACK,
  HOT_POTATO,
  PLAY_DURATION,
  POTATO_DURATION,
  POTATO_PASSES,
  POTATO_PICKUP_DWELL,
  PROMPT_DURATION,
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
 * @param {ReturnType<HOT_POTATO.create>} play
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

function bothOn(x, y) {
  return {
    left_wrist: { x, y, confidence: 1 },
    right_wrist: { x, y, confidence: 1 },
  };
}

assert(isMicrogameDef(HOT_POTATO), "hot potato must satisfy the microgame contract");
assert(HOT_POTATO.prompt === "Pass!", "on-screen prompt is Pass!");
assert(HOT_POTATO.duration === POTATO_DURATION, "pack duration should match the potato timer");
assert(POTATO_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(POTATO_PASSES === 1, "win rule is at least one successful pass before the timer");
assert(DEFAULT_PACK.some((def) => def.id === "hot-potato"), "hot potato joins the session pack");

const play = HOT_POTATO.create({ random: () => 0.2, index: 1, duration: HOT_POTATO.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "hot-potato", "the view should expose the potato scene");
assert(startView.scene.potato.held === false, "the potato starts on the field");
assert(startView.scene.potato.offered === false, "the potato is not offered at rest");
assert(startView.scene.passes === 0, "no passes yet");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the potato timer should be live");

const potato = startView.scene.potato;
const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
assert(play.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");

drainPlay(play, POTATO_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: potato.x, y: potato.y, confidence: 1 } }));
assert(play.getView().scene.potato.held === true, "hovering a wrist for the dwell should stick the potato");
assert(play.getView().scene.potato.heldBy === "p1:left_wrist", "first wrist owns the potato");
assert(play.getView().scene.passes === 0, "pickup is not a pass");

play.tick(
  1 / 60,
  twoBodies(
    { left_wrist: { x: 0.42, y: 0.5, confidence: 1 } },
    { right_wrist: { x: 0.42, y: 0.5, confidence: 1 } },
  ),
);
assert(play.getView().scene.potato.heldBy === "p1:left_wrist", "a second body cannot steal without an offer");
assert(play.getView().scene.passes === 0, "overlap-steal does not count as a pass");

play.tick(1 / 60, oneBody(bothOn(0.5, 0.5)));
assert(play.getView().scene.potato.offered === true, "both owner hands latch the offered cue");
assert(play.getView().scene.potato.heldBy === "p1:left_wrist", "the offering hand does not instantly take the potato");

const accepted = play.tick(
  1 / 60,
  twoBodies(bothOn(0.5, 0.5), { left_wrist: { x: 0.5, y: 0.5, confidence: 1 } }),
);
assert(accepted === "win", "one successful offer/accept pass wins");
assert(play.getView().scene.potato.heldBy === "p2:left_wrist", "the other body accepts");
assert(play.getView().scene.passes === 1, "the win rule counts that transfer");
assert(play.getView().scene.potato.offered === false, "accept clears the offer");

const timeoutPlay = HOT_POTATO.create({ random: () => 0.2, index: 1, duration: HOT_POTATO.duration });
timeoutPlay.start();
const timed = drainPlay(timeoutPlay, POTATO_DURATION + 0.1, far);
assert(timed === "fail", "timeout before a pass should fail");
assert(timeoutPlay.getView().scene.passes === 0, "a timeout leaves passes at 0");

const holdOnly = HOT_POTATO.create({ random: () => 0.2, index: 1, duration: HOT_POTATO.duration });
holdOnly.start();
const holdPotato = holdOnly.getView().scene.potato;
drainPlay(holdOnly, POTATO_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: holdPotato.x, y: holdPotato.y, confidence: 1 } }));
assert(drainPlay(holdOnly, POTATO_DURATION, oneBody({ left_wrist: { x: 0.4, y: 0.4, confidence: 1 } })) === "fail");
assert(holdOnly.getView().scene.passes === 0, "holding without a pass still fails on timeout");

const solo = HOT_POTATO.create({ random: () => 0.8, index: 1, duration: HOT_POTATO.duration });
solo.start();
const soloPotato = solo.getView().scene.potato;
drainPlay(solo, POTATO_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: soloPotato.x, y: soloPotato.y, confidence: 1 } }));
solo.tick(1 / 60, oneBody(bothOn(0.48, 0.52)));
assert(solo.getView().scene.potato.offered === true, "same-body two-hand contact offers");
solo.tick(1 / 60, oneBody({ left_wrist: { x: 0.48, y: 0.52, confidence: 1 } }));
const swapped = solo.tick(1 / 60, oneBody(bothOn(0.48, 0.52)));
assert(swapped === "win", "solo left-to-right offer/accept is a pass");
assert(solo.getView().scene.potato.heldBy === "p1:right_wrist", "the other hand accepts on the same body");
assert(solo.getView().scene.passes === 1, "solo pass counts toward the win rule");

const pointer = HOT_POTATO.create({ random: () => 0.2, index: 1, duration: HOT_POTATO.duration });
pointer.start();
const pointerPotato = pointer.getView().scene.potato;
drainPlay(
  pointer,
  POTATO_PICKUP_DWELL + 0.05,
  oneBody({ pointer: { x: pointerPotato.x, y: pointerPotato.y, confidence: 1 } }, "mouse"),
);
assert(pointer.getView().scene.potato.held === true, "pointer can pick up when the camera is off");
pointer.tick(
  1 / 60,
  oneBody(
    {
      pointer: { x: 0.5, y: 0.5, confidence: 1 },
      left_wrist: { x: 0.5, y: 0.5, confidence: 1 },
      right_wrist: { x: 0.5, y: 0.5, confidence: 1 },
    },
    "mouse",
  ),
);
assert(pointer.getView().scene.potato.offered === true, "camera-off offer still uses both hands");
const pointerPass = pointer.tick(
  1 / 60,
  twoBodies(
    {
      pointer: { x: 0.5, y: 0.5, confidence: 1 },
      left_wrist: { x: 0.5, y: 0.5, confidence: 1 },
      right_wrist: { x: 0.5, y: 0.5, confidence: 1 },
    },
    { left_wrist: { x: 0.5, y: 0.5, confidence: 1 } },
    "mouse",
  ),
);
assert(pointerPass === "win", "a second map can accept an offered potato when the camera is off");

const keys = HOT_POTATO.create({ random: () => 0.2, index: 1, duration: HOT_POTATO.duration });
keys.start();
const keyPotato = keys.getView().scene.potato;
drainPlay(
  keys,
  POTATO_PICKUP_DWELL + 0.05,
  oneBody({ left_wrist: { x: keyPotato.x, y: keyPotato.y, confidence: 1 } }, "keyboard"),
);
keys.tick(1 / 60, oneBody(bothOn(0.5, 0.5), "keyboard"));
keys.tick(1 / 60, oneBody({ left_wrist: { x: 0.5, y: 0.5, confidence: 1 } }, "keyboard"));
assert(keys.tick(1 / 60, oneBody(bothOn(0.5, 0.5), "keyboard")) === "win", "keyboard stand-in can offer and accept between hands");

const session = createGame({
  random: () => 0.2,
  games: 1,
  shuffle: false,
  pack: [HOT_POTATO],
});
session.start();
assert(session.getState().prompt === "Pass!", "Play should flash Pass!");
assert(session.getState().gameId === "hot-potato", "the live game id should be hot-potato");
drainGame(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "the prompt should hand off to hot potato");
const livePotato = session.getState().scene.potato;
drainGame(session, POTATO_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: livePotato.x, y: livePotato.y, confidence: 1 } }));
assert(session.getState().scene.potato.held === true, "session play should stick the potato");
session.tick(1 / 60, oneBody(bothOn(0.5, 0.5)));
session.tick(1 / 60, oneBody({ left_wrist: { x: 0.5, y: 0.5, confidence: 1 } }));
session.tick(1 / 60, oneBody(bothOn(0.5, 0.5)));
assert(session.getState().result === "win", "a solo pass should resolve as a session win");
assert(session.getState().scores.p1 === 1, "coop success credits P1");
assert(session.getState().scores.p2 === 1, "a 2P coop win also credits P2");
assert(session.getState().score === 2, "shared potato success adds to both scores");

console.log("game/potato.test.mjs passed");
