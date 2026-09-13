/**
 * Kick the ball (#31): ankle striker + drifting target. Sibling to stomp.
 * Pointer / keyboard is the camera-off foot. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { FOOT_STRIKER_NAMES, HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const KICK_DURATION = PLAY_DURATION;
export const KICK_DWELL = 0.28;
export const KICK_DRIVE = 0.08;

const FIELD = { x0: 0.18, x1: 0.82, y0: 0.46, y1: 0.74 };
const SPAWN_CLEARANCE = 0.18;
const DRIFT_MIN = 0.045;
const DRIFT_SPAN = 0.04;

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} KickScene
 * @property {"kick-ball"} kind
 * @property {{ x: number, y: number, stage: number }} ball
 * @property {boolean} kicking
 */

/**
 * @param {() => number} random
 * @param {number} id
 * @returns {Target}
 */
export function makeBall(random, id) {
  let x = lerp(FIELD.x0, FIELD.x1, random());
  let y = lerp(FIELD.y0, FIELD.y1, random());
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (x > FIELD.x0 + SPAWN_CLEARANCE && x < FIELD.x1 - SPAWN_CLEARANCE) break;
    x = lerp(FIELD.x0, FIELD.x1, random());
    y = lerp(FIELD.y0, FIELD.y1, random());
  }
  const angle = random() * Math.PI * 2;
  const speed = DRIFT_MIN + random() * DRIFT_SPAN;
  return {
    id,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * @param {Target} target
 * @param {number} step
 */
export function driftBall(target, step) {
  target.x += target.vx * step;
  target.y += target.vy * step;
  if (target.x < FIELD.x0 || target.x > FIELD.x1) {
    target.vx *= -1;
    target.x = clamp(target.x, FIELD.x0, FIELD.x1);
  }
  if (target.y < FIELD.y0 || target.y > FIELD.y1) {
    target.vy *= -1;
    target.y = clamp(target.y, FIELD.y0, FIELD.y1);
  }
}

export const KICK_BALL = defineMicrogame({
  id: "kick-ball",
  prompt: "Kick ball",
  backgroundId: "pitch",
  duration: KICK_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : KICK_DURATION;
    let nextId = 1;
    /** @type {Target} */
    let ball = makeBall(random, nextId++);
    /** @type {Map<string, number>} */
    const hover = new Map();
    /** @type {Map<string, { x: number, y: number }>} */
    const lastPos = new Map();
    let kicking = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        ball = makeBall(random, nextId++);
        hover.clear();
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
        driftBall(ball, step);

        const strikers = listIdentifiedStrikers(sample, FOOT_STRIKER_NAMES);
        kicking = false;
        const seen = new Set();

        for (const striker of strikers) {
          seen.add(striker.id);
          const over = overlaps(striker, ball);
          const prev = lastPos.get(striker.id);
          if (over) {
            kicking = true;
            const travel = prev ? Math.hypot(striker.x - prev.x, striker.y - prev.y) : 0;
            const wasOut = !prev || !overlaps(prev, ball);
            if (wasOut && travel >= KICK_DRIVE) return boot();
            const held = (hover.get(striker.id) ?? 0) + step;
            hover.set(striker.id, held);
            if (held >= KICK_DWELL) return boot();
          } else {
            hover.set(striker.id, 0);
          }
          lastPos.set(striker.id, { x: striker.x, y: striker.y });
        }

        for (const id of hover.keys()) {
          if (!seen.has(id)) hover.set(id, 0);
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
            kind: "kick-ball",
            ball: { x: ball.x, y: ball.y, stage: outcome === "win" ? 1 : 0 },
            kicking: kicking || outcome === "win",
          },
        };
      },
    };

    function boot() {
      ball.vx = 0;
      ball.vy = 0;
      kicking = true;
      outcome = "win";
      return "win";
    }
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
