/**
 * Swat the fly (#83): small drifting target + a quick wrist slap.
 * Faster / smaller sibling of Hit orb. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listSampleStrikers } from "./hit.js";
import { FULL_LANE, fieldInLane } from "./layout.js";
import { driftOrb, makeTarget } from "./orb.js";

export const FLY_DURATION = PLAY_DURATION;
export const FLY_RADIUS = HIT_RADIUS * 0.72;
export const FLY_DRIFT = 1.85;

const FIELD = { x0: 0.18, x1: 0.82, y0: 0.22, y1: 0.72 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} FlyScene
 * @property {"swat-fly"} kind
 * @property {{ x: number, y: number, stage: number }} fly
 * @property {boolean} swatted
 */

export function driftFly(target, step, field = FIELD) {
  driftOrb(target, step, field);
}

export const SWAT_FLY = defineMicrogame({
  id: "swat-fly",
  prompt: "Swat!",
  backgroundId: "crystal",
  duration: FLY_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FLY_DURATION;
    const field = fieldInLane(lane, FIELD);
    let nextId = 1;
    /** @type {Target} */
    let fly = makeTarget(random, nextId++, [], null, FLY_DRIFT, field);
    let swatted = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        fly = makeTarget(random, nextId++, [], null, FLY_DRIFT, field);
        swatted = false;
        timeLeft = lifetime;
        outcome = "playing";
      },
      /**
       * @param {number} dt
       * @param {PoseSample} sample
       */
      tick(dt, sample) {
        if (outcome !== "playing") return outcome;
        driftFly(fly, dt, field);
        const strikers = listSampleStrikers(sample);
        if (strikers.some((joint) => Math.hypot(joint.x - fly.x, joint.y - fly.y) <= FLY_RADIUS)) {
          swatted = true;
          fly.vx = 0;
          fly.vy = 0;
          outcome = "win";
          return "win";
        }
        timeLeft = Math.max(0, timeLeft - (Number.isFinite(dt) ? Math.max(0, dt) : 0));
        if (timeLeft <= 0) {
          outcome = "fail";
          return "fail";
        }
        return "playing";
      },
      getView() {
        return {
          target: fly,
          timeLeft,
          lifetime,
          scene: {
            kind: "swat-fly",
            fly: { x: fly.x, y: fly.y, stage: swatted ? 1 : 0 },
            swatted,
          },
        };
      },
    };
  },
});
