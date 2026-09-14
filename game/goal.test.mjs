import {
  DEFAULT_PACK,
  GOAL_DURATION,
  GOAL_MOUTH,
  PLAY_DURATION,
  PROMPT_DURATION,
  SCORE_GOAL,
  createGame,
  inGoal,
  isMicrogameDef,
  isPlayOutcome,
  rollBall,
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
 * @param {ReturnType<SCORE_GOAL.create>} play
 * @param {number} seconds
 * @param {object} sample
 */
function drainPlay(play, seconds, sample = idle()) {
  let outcome = "playing";
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  for (let i = 0; i < steps; i += 1) {
    const pose = typeof sample === "function" ? sample(play) : sample;
    outcome = play.tick(1 / 60, pose);
  }
  return outcome;
}

function kickTowardGoal(play, jointName, source = "webcam") {
  const ball = play.getView().scene.ball;
  play.tick(1 / 60, oneBody({ [jointName]: { x: ball.x - 0.14, y: ball.y, confidence: 1 } }, source));
  return play.tick(
    1 / 60,
    oneBody({ [jointName]: { x: ball.x + 0.04, y: ball.y, confidence: 1 } }, source),
  );
}

assert(isMicrogameDef(SCORE_GOAL), "score a goal must satisfy the microgame contract");
assert(SCORE_GOAL.prompt === "Score!", "on-screen prompt is Score!");
assert(SCORE_GOAL.id === "score-goal", "id is score-goal");
assert(SCORE_GOAL.duration === GOAL_DURATION, "pack duration should match the goal timer");
assert(GOAL_DURATION === PLAY_DURATION, "duration is the post-#51 15–20s window");
assert(DEFAULT_PACK.some((def) => def.id === "score-goal"), "score a goal joins the session pack");
assert(!DEFAULT_PACK.some((def) => def.id === "kick-ball"), "kick the ball is retired from the pack");

const play = SCORE_GOAL.create({ random: () => 0.2, index: 1, duration: SCORE_GOAL.duration });
play.start();
assert(isPlayOutcome(play.tick(1 / 60, idle())), "tick must return a contract outcome");
const startView = play.getView();
assert(startView.scene?.kind === "score-goal", "the view should expose the goal scene");
assert(startView.scene.kicking === false, "the ball starts un-kicked");
assert(inGoal(startView.scene.ball) === false, "the ball does not spawn in the goal");
assert(startView.scene.goal.x0 === GOAL_MOUTH.x0, "the scene exposes the goal mouth");
assert(startView.timeLeft != null && startView.timeLeft > 15, "the goal timer should be live");

const ball = startView.scene.ball;
assert(
  drainPlay(play, 0.4, oneBody({ left_wrist: { x: ball.x, y: ball.y, confidence: 1 } })) === "playing",
  "a wrist on the ball is not a score",
);
assert(
  drainPlay(play, 0.5, (live) => {
    const mark = live.getView().scene.ball;
    return oneBody({ left_ankle: { x: mark.x, y: mark.y, confidence: 1 } });
  }) === "playing",
  "contact alone — an ankle sitting on the ball — is not a goal",
);

const shot = SCORE_GOAL.create({ random: () => 0.2, index: 1, duration: SCORE_GOAL.duration });
shot.start();
assert(kickTowardGoal(shot, "left_ankle") === "playing", "the kick itself is not yet a win");
assert(shot.getView().scene.kicking === true, "a drive should mark the kick");
assert(shot.getView().target.vx > 0.3, "the ball should carry velocity toward the goal");
const rolled = drainPlay(shot, 2.2, idle());
assert(rolled === "win", "the ball should roll into the goal after a kick");
assert(inGoal(shot.getView().scene.ball), "win is ball-center in the goal zone");

const pointerShot = SCORE_GOAL.create({ random: () => 0.25, index: 1, duration: SCORE_GOAL.duration });
pointerShot.start();
kickTowardGoal(pointerShot, "pointer", "mouse");
assert(drainPlay(pointerShot, 2.2, idle()) === "win", "pointer is the camera-off foot for a goal");

const p2 = SCORE_GOAL.create({ random: () => 0.2, index: 1, duration: SCORE_GOAL.duration });
p2.start();
const p2Ball = p2.getView().scene.ball;
p2.tick(
  1 / 60,
  twoBodies(
    { left_wrist: { x: 0.1, y: 0.1, confidence: 1 } },
    { right_ankle: { x: p2Ball.x - 0.14, y: p2Ball.y, confidence: 1 } },
  ),
);
p2.tick(
  1 / 60,
  twoBodies(
    { left_wrist: { x: 0.1, y: 0.1, confidence: 1 } },
    { right_ankle: { x: p2Ball.x + 0.04, y: p2Ball.y, confidence: 1 } },
  ),
);
assert(drainPlay(p2, 2.2, idle()) === "win", "the second body can kick the shared ball");

const far = oneBody({ pointer: { x: 0.05, y: 0.05, confidence: 1 } }, "mouse");
const timeoutPlay = SCORE_GOAL.create({ random: () => 0.2, index: 1, duration: SCORE_GOAL.duration });
timeoutPlay.start();
assert(timeoutPlay.tick(1 / 60, far) === "playing", "a far pointer is not a wrong-gesture fail");
assert(drainPlay(timeoutPlay, GOAL_DURATION + 0.1, far) === "fail", "timeout before a goal should fail");
assert(timeoutPlay.getView().timeLeft === 0, "a miss should empty the timer");

const physics = { x: 0.5, y: 0.6, vx: 0.9, vy: 0, id: 1 };
rollBall(physics, 0.2);
assert(physics.x > 0.5, "roll advances with velocity");
assert(physics.vx < 0.9, "friction bleeds speed");
assert(inGoal({ x: 0.88, y: 0.56 }) === true, "a center in the mouth is a goal");
assert(inGoal({ x: 0.5, y: 0.56 }) === false, "midfield is not a goal");

const session = createGame({
  pack: [SCORE_GOAL],
  games: 1,
  shuffle: false,
  random: () => 0.2,
});
session.start();
const steps = Math.ceil(PROMPT_DURATION / (1 / 60)) + 2;
for (let i = 0; i < steps; i += 1) session.tick(1 / 60, idle());
assert(session.getState().gameId === "score-goal", "the session can play score a goal");
assert(session.getState().backgroundId === "pitch", "score reuses the pitch stage set");

console.log("game/goal.test.mjs passed");
