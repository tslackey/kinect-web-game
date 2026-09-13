/**
 * First playable microgame: hit the drifting orb before the timer runs out.
 * One success ends the game. Timeout is a miss. Idle / a far hand is not a fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { hitsTarget, listSampleStrikers } from "./hit.js";

export const TARGET_LIFETIME = PLAY_DURATION;
export const LIFETIME_STEP = 0.4;
export const DRIFT_BOOST = 0.25;

const FIELD = { x0: 0.46, x1: 0.88, y0: 0.28, y1: 0.76 };
const SPAWN_CLEARANCE = 0.22;
const DRIFT_MIN = 0.035;
const DRIFT_SPAN = 0.045;

/**
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 */

/**
 * @typedef {object} Target
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 */

/**
 * @param {number} index 1-based game in the session
 */
export function lifetimeForGame(index) {
  void index;
  return PLAY_DURATION;
}

/**
 * @param {number} index 1-based game in the session
 */
export function driftScaleForGame(index) {
  return 1 + Math.max(0, index - 1) * DRIFT_BOOST;
}

/**
 * @param {() => number} random
 * @param {number} id
 * @param {Joint[]} strikers
 * @param {Target | null} avoid
 * @param {number} [driftScale]
 * @returns {Target}
 */
export function makeTarget(random, id, strikers, avoid, driftScale = 1) {
  let x = lerp(FIELD.x0, FIELD.x1, random());
  let y = lerp(FIELD.y0, FIELD.y1, random());

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clear = [...strikers, avoid].every(
      (point) => !point || Math.hypot(point.x - x, point.y - y) >= SPAWN_CLEARANCE,
    );
    if (clear) break;
    x = lerp(FIELD.x0, FIELD.x1, random());
    y = lerp(FIELD.y0, FIELD.y1, random());
  }

  const angle = random() * Math.PI * 2;
  const speed = (DRIFT_MIN + random() * DRIFT_SPAN) * driftScale;
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
export function driftOrb(target, step) {
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

export const ORB_HIT = defineMicrogame({
  id: "orb-hit",
  prompt: "Hit orb",
  backgroundId: "crystal",
  duration: TARGET_LIFETIME,
  create({ random, index, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : lifetimeForGame(index);
    const driftScale = driftScaleForGame(index);
    let nextId = 1;
    /** @type {Target} */
    let target = makeTarget(random, nextId++, [], null, driftScale);
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /** @returns {MicrogamePlay} */
    function api() {
      return {
        start() {
          target = makeTarget(random, nextId++, [], null, driftScale);
          timeLeft = lifetime;
          outcome = "playing";
        },
        /**
         * @param {number} dt
         * @param {PoseSample} sample
         */
        tick(dt, sample) {
          if (outcome !== "playing") return outcome;
          driftOrb(target, dt);
          const strikers = listSampleStrikers(sample);
          if (hitsTarget(strikers, target)) {
            outcome = "win";
            return "win";
          }
          timeLeft = Math.max(0, timeLeft - dt);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          return { target, timeLeft, lifetime, driftScale };
        },
      };
    }

    return api();
  },
});

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
