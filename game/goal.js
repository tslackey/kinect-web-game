/**
 * Score a goal (#75): replace Kick the ball (#31).
 * Ankle / pointer-foot strikes impart velocity; the ball rolls with
 * friction into a goal zone. Contact alone is not a win.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { FOOT_STRIKER_NAMES, HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const GOAL_DURATION = PLAY_DURATION;
/** Min striker travel on first contact to count as a kick. */
export const GOAL_DRIVE = 0.06;
/** Launch speed for a full-power kick (travel ≥ 0.12). */
export const GOAL_SPEED = 1.05;
export const GOAL_FRICTION = 1.15;
export const GOAL_MAX_SPEED = 2.2;

const FIELD = { x0: 0.16, x1: 0.8, y0: 0.44, y1: 0.76 };
/** Goal mouth sits just past the right field line. */
export const GOAL_MOUTH = { x0: 0.8, x1: 0.96, y0: 0.44, y1: 0.72 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} GoalScene
 * @property {"score-goal"} kind
 * @property {{ x: number, y: number, stage: number }} ball
 * @property {{ x0: number, y0: number, x1: number, y1: number }} goal
 * @property {boolean} kicking
 */

/**
 * @param {() => number} random
 * @param {number} id
 * @returns {Target}
 */
export function makeGoalBall(random, id) {
  const rxRaw = random();
  const ryRaw = random();
  const rx = Number.isFinite(rxRaw) ? rxRaw : 0.3;
  const ry = Number.isFinite(ryRaw) ? ryRaw : 0.5;
  return {
    id,
    x: lerp(0.22, 0.46, rx),
    y: lerp(FIELD.y0 + 0.06, FIELD.y1 - 0.06, ry),
    vx: 0,
    vy: 0,
  };
}

/**
 * Ground roll: velocity + friction. Bounces on the field; the right wall
 * opens into the goal mouth.
 *
 * @param {Target} ball
 * @param {number} step
 */
export function rollBall(ball, step) {
  const dt = Number.isFinite(step) ? Math.max(0, step) : 0;
  if (dt <= 0) return;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  const damp = Math.exp(-GOAL_FRICTION * dt);
  ball.vx *= damp;
  ball.vy *= damp;

  if (ball.y < FIELD.y0 || ball.y > FIELD.y1) {
    ball.vy *= -0.55;
    ball.y = clamp(ball.y, FIELD.y0, FIELD.y1);
  }
  if (ball.x < FIELD.x0) {
    ball.vx *= -0.55;
    ball.x = FIELD.x0;
  }
  if (ball.x > FIELD.x1 && !inGoalMouthY(ball.y)) {
    ball.vx *= -0.55;
    ball.x = FIELD.x1;
  }
  ball.x = Math.min(ball.x, GOAL_MOUTH.x1);
}

/**
 * Ball center inside the goal zone.
 *
 * @param {{ x: number, y: number }} ball
 */
export function inGoal(ball) {
  return (
    ball.x >= GOAL_MOUTH.x0 &&
    ball.x <= GOAL_MOUTH.x1 &&
    ball.y >= GOAL_MOUTH.y0 &&
    ball.y <= GOAL_MOUTH.y1
  );
}

export const SCORE_GOAL = defineMicrogame({
  id: "score-goal",
  prompt: "Score!",
  backgroundId: "pitch",
  duration: GOAL_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : GOAL_DURATION;
    let nextId = 1;
    /** @type {Target} */
    let ball = makeGoalBall(random, nextId++);
    /** @type {Map<string, { x: number, y: number }>} */
    const lastPos = new Map();
    let kicking = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        ball = makeGoalBall(random, nextId++);
        lastPos.clear();
        kicking = false;
        timeLeft = lifetime;
        outcome = "playing";
      },
      /**
       * @param {number} dt
       * @param {PoseSample} sample
       */
      tick(dt, sample) {
        if (outcome !== "playing") return outcome;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        kicking = false;

        const strikers = listIdentifiedStrikers(sample, FOOT_STRIKER_NAMES);
        const seen = new Set();
        for (const striker of strikers) {
          seen.add(striker.id);
          const prev = lastPos.get(striker.id);
          const over = overlaps(striker, ball);
          if (over && prev) {
            const dx = striker.x - prev.x;
            const dy = striker.y - prev.y;
            const travel = Math.hypot(dx, dy);
            const wasOver = overlaps(prev, ball);
            if (!wasOver && travel >= GOAL_DRIVE) {
              applyImpulse(ball, dx, dy, travel);
              kicking = true;
            }
          }
          lastPos.set(striker.id, { x: striker.x, y: striker.y });
        }
        for (const id of lastPos.keys()) {
          if (!seen.has(id)) lastPos.delete(id);
        }

        rollBall(ball, step);
        if (inGoal(ball)) {
          ball.vx = 0;
          ball.vy = 0;
          kicking = true;
          outcome = "win";
          return "win";
        }

        timeLeft = Math.max(0, timeLeft - step);
        if (timeLeft <= 0) {
          outcome = "fail";
          return "fail";
        }
        return "playing";
      },
      getView() {
        return {
          target: ball,
          timeLeft,
          lifetime,
          scene: {
            kind: "score-goal",
            ball: { x: ball.x, y: ball.y, stage: outcome === "win" ? 1 : 0 },
            goal: { ...GOAL_MOUTH },
            kicking: kicking || outcome === "win",
          },
        };
      },
    };
  },
});

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function overlaps(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}

/**
 * @param {Target} ball
 * @param {number} dx
 * @param {number} dy
 * @param {number} travel
 */
function applyImpulse(ball, dx, dy, travel) {
  const power = Math.min(1, travel / 0.12);
  ball.vx += (dx / travel) * power * GOAL_SPEED;
  ball.vy += (dy / travel) * power * GOAL_SPEED;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > GOAL_MAX_SPEED) {
    ball.vx *= GOAL_MAX_SPEED / speed;
    ball.vy *= GOAL_MAX_SPEED / speed;
  }
}

/**
 * @param {number} y
 */
function inGoalMouthY(y) {
  return y >= GOAL_MOUTH.y0 && y <= GOAL_MOUTH.y1;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
