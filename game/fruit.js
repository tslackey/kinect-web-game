/**
 * Catch the fruit (#35): falling target + wrist (or pointer).
 * A miss on one fruit respawns — only timeout fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const FRUIT_DURATION = PLAY_DURATION;
export const FRUIT_FALL = 0.22;

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} FruitScene
 * @property {"catch-fruit"} kind
 * @property {{ x: number, y: number, stage: number }} fruit
 * @property {boolean} caught
 */

/**
 * @param {() => number} random
 * @param {number} id
 * @returns {Target}
 */
export function makeFruit(random, id) {
  return {
    id,
    x: 0.22 + random() * 0.56,
    y: 0.08 + random() * 0.06,
    vx: (random() - 0.5) * 0.08,
    vy: FRUIT_FALL + random() * 0.06,
  };
}

export const CATCH_FRUIT = defineMicrogame({
  id: "catch-fruit",
  prompt: "Catch fruit",
  backgroundId: "grove",
  duration: FRUIT_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FRUIT_DURATION;
    let nextId = 1;
    /** @type {Target} */
    let fruit = makeFruit(random, nextId++);
    let timeLeft = lifetime;
    let caught = false;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        fruit = makeFruit(random, nextId++);
        timeLeft = lifetime;
        caught = false;
        outcome = "playing";
      },
      /**
       * @param {number} dt
       * @param {PoseSample} sample
       */
      tick(dt, sample) {
        if (outcome !== "playing") return outcome;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        fruit.x = clamp(fruit.x + fruit.vx * step, 0.12, 0.88);
        fruit.y += fruit.vy * step;
        if (fruit.y > 0.92) {
          fruit = makeFruit(random, nextId++);
        }

        const strikers = listIdentifiedStrikers(sample);
        if (strikers.some((joint) => Math.hypot(joint.x - fruit.x, joint.y - fruit.y) <= HIT_RADIUS)) {
          caught = true;
          fruit.vx = 0;
          fruit.vy = 0;
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
          target: fruit,
          timeLeft,
          lifetime,
          scene: {
            kind: "catch-fruit",
            fruit: { x: fruit.x, y: fruit.y, stage: outcome === "win" ? 1 : 0 },
            caught,
          },
        };
      },
    };
  },
});

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
