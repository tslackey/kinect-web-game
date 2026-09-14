/**
 * Shoot some hoops (#77): wrist / pointer tosses a ball on an arc.
 * Success is ball-in-hoop, not High-five-style wrist-in-zone.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const HOOPS_DURATION = PLAY_DURATION;
export const HOOPS_DRIVE = 0.05;
/** Launch speed for a full-power toss (travel ≥ 0.12). */
export const HOOPS_SPEED = 1.35;
export const HOOPS_GRAVITY = 1.45;
export const HOOPS_DRAG = 0.22;
export const HOOPS_MAX_SPEED = 2.4;

export const HOOP = { x: 0.72, y: 0.22, halfW: 0.1, halfH: 0.05 };
const BALL_START = { x: 0.36, y: 0.66 };
const FLOOR_Y = 0.86;
const WALL_X0 = 0.08;
const WALL_X1 = 0.92;

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} HoopsScene
 * @property {"shoot-hoops"} kind
 * @property {{ x: number, y: number, stage: number }} ball
 * @property {{ x: number, y: number }} hoop
 * @property {boolean} shooting
 */

/**
 * @param {number} id
 * @returns {Target}
 */
export function makeHoopBall(id) {
  return { id, x: BALL_START.x, y: BALL_START.y, vx: 0, vy: 0 };
}

/**
 * Ballistic step after a toss. Sitting balls stay put until struck.
 *
 * @param {Target} ball
 * @param {number} step
 * @param {boolean} airborne
 */
export function flyBall(ball, step, airborne) {
  const dt = Number.isFinite(step) ? Math.max(0, step) : 0;
  if (dt <= 0 || !airborne) return;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vy += HOOPS_GRAVITY * dt;
  const damp = Math.exp(-HOOPS_DRAG * dt);
  ball.vx *= damp;

  if (ball.x < WALL_X0 || ball.x > WALL_X1) {
    ball.vx *= -0.4;
    ball.x = clamp(ball.x, WALL_X0, WALL_X1);
  }
  if (ball.y > FLOOR_Y) {
    ball.y = FLOOR_Y;
    ball.vy *= -0.28;
    ball.vx *= 0.7;
    if (Math.abs(ball.vy) < 0.12) ball.vy = 0;
  }
  if (ball.y < 0.04) {
    ball.y = 0.04;
    ball.vy *= -0.2;
  }
}

/**
 * Center overlap with the hoop opening, or a path that crossed it.
 *
 * @param {{ x: number, y: number }} prev
 * @param {{ x: number, y: number }} ball
 * @param {{ x: number, y: number, halfW: number, halfH: number }} [hoop]
 */
export function throughHoop(prev, ball, hoop = HOOP) {
  if (inHoop(ball, hoop)) return true;
  const inX =
    Math.abs(ball.x - hoop.x) <= hoop.halfW || Math.abs(prev.x - hoop.x) <= hoop.halfW;
  const crossed = (prev.y - hoop.y) * (ball.y - hoop.y) <= 0 && prev.y !== ball.y;
  return inX && crossed && Math.abs(ball.y - hoop.y) <= hoop.halfH + 0.04;
}

/**
 * @param {{ x: number, y: number }} ball
 * @param {{ x: number, y: number, halfW: number, halfH: number }} [hoop]
 */
export function inHoop(ball, hoop = HOOP) {
  return Math.abs(ball.x - hoop.x) <= hoop.halfW && Math.abs(ball.y - hoop.y) <= hoop.halfH;
}

export const SHOOT_HOOPS = defineMicrogame({
  id: "shoot-hoops",
  prompt: "Shoot!",
  backgroundId: "hoop",
  duration: HOOPS_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : HOOPS_DURATION;
    let nextId = 1;
    /** @type {Target} */
    let ball = makeHoopBall(nextId++);
    /** @type {Map<string, { x: number, y: number }>} */
    const lastPos = new Map();
    let airborne = false;
    let shooting = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        ball = makeHoopBall(nextId++);
        lastPos.clear();
        airborne = false;
        shooting = false;
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
        shooting = false;
        const prev = { x: ball.x, y: ball.y };

        const strikers = listIdentifiedStrikers(sample);
        const seen = new Set();
        for (const striker of strikers) {
          seen.add(striker.id);
          const last = lastPos.get(striker.id);
          const over = overlaps(striker, ball);
          if (over && last) {
            const dx = striker.x - last.x;
            const dy = striker.y - last.y;
            const travel = Math.hypot(dx, dy);
            const wasOver = overlaps(last, ball);
            if (!wasOver && travel >= HOOPS_DRIVE) {
              applyImpulse(ball, dx, dy, travel);
              airborne = true;
              shooting = true;
            }
          }
          lastPos.set(striker.id, { x: striker.x, y: striker.y });
        }
        for (const id of lastPos.keys()) {
          if (!seen.has(id)) lastPos.delete(id);
        }

        flyBall(ball, step, airborne);
        if (throughHoop(prev, ball)) {
          ball.vx = 0;
          ball.vy = 0;
          airborne = false;
          shooting = true;
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
            kind: "shoot-hoops",
            ball: { x: ball.x, y: ball.y, stage: outcome === "win" ? 1 : 0 },
            hoop: { x: HOOP.x, y: HOOP.y },
            shooting: shooting || outcome === "win",
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
  ball.vx += (dx / travel) * power * HOOPS_SPEED;
  ball.vy += (dy / travel) * power * HOOPS_SPEED;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > HOOPS_MAX_SPEED) {
    ball.vx *= HOOPS_MAX_SPEED / speed;
    ball.vy *= HOOPS_MAX_SPEED / speed;
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
