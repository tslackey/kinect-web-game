/**
 * Head the ball (#109): a ball falls; nose/head overlaps it before ground.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS } from "./hit.js";
import { jointOf, somePose } from "./body.js";
import { FULL_LANE, fieldInLane } from "./layout.js";

export const HEAD_DURATION = PLAY_DURATION;
export const HEAD_FALL = 0.24;

const FIELD = { x0: 0.18, x1: 0.82, y0: 0.08, y1: 0.9 };

/**
 * @typedef {import("./orb.js").Target} Target
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 */

/**
 * @typedef {object} HeadScene
 * @property {"head-ball"} kind
 * @property {{ x: number, y: number, stage: number }} ball
 * @property {boolean} headed
 */

export const HEAD_BALL = defineMicrogame({
  id: "head-ball",
  prompt: "Head!",
  backgroundId: "pitch",
  duration: HEAD_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : HEAD_DURATION;
    const field = fieldInLane(lane, FIELD);
    let nextId = 1;
    /** @type {Target} */
    let ball = spawn();
    let headed = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    function spawn() {
      return {
        id: nextId++,
        x: lerp(field.x0 + 0.08, field.x1 - 0.08, random()),
        y: lerp(field.y0, field.y0 + 0.08, random()),
        vx: (random() - 0.5) * 0.06,
        vy: HEAD_FALL + random() * 0.04,
      };
    }

    return {
      start() {
        ball = spawn();
        headed = false;
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
        ball.x = clamp(ball.x + ball.vx * step, field.x0, field.x1);
        ball.y += ball.vy * step;
        const bonk = somePose(sample, (pose) => {
          const head = jointOf(pose, "nose") ?? jointOf(pose, "pointer");
          return Boolean(head && Math.hypot(head.x - ball.x, head.y - ball.y) <= HIT_RADIUS);
        });
        if (bonk) {
          headed = true;
          ball.vy = 0;
          ball.vx = 0;
          outcome = "win";
          return "win";
        }
        if (ball.y > 0.9) {
          outcome = "fail";
          return "fail";
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
            kind: "head-ball",
            ball: { x: ball.x, y: ball.y, stage: headed ? 1 : 0 },
            headed,
          },
        };
      },
    };
  },
});

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
