import {
  DEFAULT_PACK,
  HOOP,
  HOOPS_DURATION,
  PLAY_DURATION,
  PROMPT_DURATION,
  SHOOT_HOOPS,
  createGame,
  inHoop,
  isMicrogameDef,
  isPlayOutcome,
  throughHoop,
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

/**
 * @param {ReturnType<SHOOT_HOOPS.create>} play
 * @param {number} seconds
 * @param {object} sample
 */
function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    const pose = typeof sample === "function" ? sample(play) : sample;
    outcome = play.tick(1 / 60, pose);
    if (outcome !== "playing") return outcome;
  }
  return outcome;
}

function tossAtHoop(play, jointName, source = "webcam") {
  const ball = play.getView().scene.ball;
  play.tick(
    1 / 60,
    oneBody({ [jointName]: { x: ball.x - 0.02, y: ball.y + 0.16, confidence: 1 } }, source),
  );
  return play.tick(
    1 / 60,
    oneBody({ [jointName]: { x: ball.x + 0.07, y: ball.y - 0.05, confidence: 1 } }, source),
  );
}

assert(isMicrogameDef(SHOOT_HOOPS), "shoot some hoops must satisfy the microgame contract");
assert(SHOOT_HOOPS.prompt === "Shoot!", "on-screen prompt is Shoot!");
assert(SHOOT_HOOPS.id === "shoot-hoops", "id is shoot-hoops");
assert(SHOOT_HOOPS.duration === HOOPS_DURATION, "pack duration should match the hoop timer");
assert(HOOPS_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(DEFAULT_PACK.some((def) => def.id === "shoot-hoops"), "shoot some hoops joins the session pack");

const play = SHOOT_HOOPS.create({ random: () => 0.2, index: 1, duration: SHOOT_HOOPS.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "shoot-hoops", "the view should expose the hoop scene");
assert(startView.scene.shooting === false, "the ball starts un-shot");
assert(inHoop(startView.scene.ball) === false, "the ball does not spawn in the hoop");
assert(startView.scene.hoop.x === HOOP.x, "the scene exposes the hoop");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the hoop timer should be live");

assert(
  play.tick(1 / 60, oneBody({ right_wrist: { x: HOOP.x, y: HOOP.y, confidence: 1 } })) === "playing",
  "a wrist in the hoop zone is not a basket — that is High five",
);

const rest = SHOOT_HOOPS.create({ random: () => 0.2, index: 1, duration: SHOOT_HOOPS.duration });
rest.start();
const ball = rest.getView().scene.ball;
assert(
  drainPlay(rest, 0.5, oneBody({ left_wrist: { x: ball.x, y: ball.y, confidence: 1 } })) === "playing",
  "resting a wrist on the ball is not a shot",
);

const shot = SHOOT_HOOPS.create({ random: () => 0.2, index: 1, duration: SHOOT_HOOPS.duration });
shot.start();
assert(tossAtHoop(shot, "right_wrist") === "playing", "the toss itself is not yet a win");
assert(shot.getView().scene.shooting === true, "a flick should mark the shot");
assert(shot.getView().target.vy < -0.4, "the ball should leave on an upward arc");
const swish = drainPlay(shot, 2.5, idle());
assert(swish === "win", "the ball should enter the hoop after a toss");
assert(inHoop(shot.getView().scene.ball) || shot.getView().scene.ball.stage === 1, "win is ball-in-hoop");

const pointerShot = SHOOT_HOOPS.create({ random: () => 0.2, index: 1, duration: SHOOT_HOOPS.duration });
pointerShot.start();
tossAtHoop(pointerShot, "pointer", "mouse");
assert(drainPlay(pointerShot, 2.5, idle()) === "win", "pointer can toss when the camera is off");

assert(
  throughHoop({ x: HOOP.x, y: HOOP.y - 0.04 }, { x: HOOP.x, y: HOOP.y + 0.04 }),
  "a path down through the rim counts",
);
assert(
  throughHoop({ x: 0.1, y: 0.5 }, { x: 0.12, y: 0.52 }) === false,
  "a miss away from the hoop does not count",
);

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
const timeoutPlay = SHOOT_HOOPS.create({ random: () => 0.2, index: 1, duration: SHOOT_HOOPS.duration });
timeoutPlay.start();
assert(timeoutPlay.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(drainPlay(timeoutPlay, HOOPS_DURATION + 0.1, far) === "fail", "timeout before a basket should fail");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const session = createGame({
  pack: [SHOOT_HOOPS],
  games: 1,
  shuffle: false,
  random: () => 0.2,
});
session.start();
const steps = Math.ceil(PROMPT_DURATION / (1 / 60)) + 2;
for (let i = 0; i < steps; i += 1) session.tick(1 / 60, idle());
assert(session.getState().gameId === "shoot-hoops", "the session can play shoot some hoops");
assert(session.getState().backgroundId === "hoop", "hoops uses the hoop stage id");

console.log("game/hoops.test.mjs passed");
