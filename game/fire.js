/**
 * Third real microgame: put out the fire.
 * Hover the bucket, carry it over the flame, douse. Timeout is the only fail.
 * Same sticky-carry + dual-zone grammar as Water the plant and Feed the pet,
 * including two-hand offer / one-hand accept.
 */

import { createStickyCarry, overlapsCarry } from "./carry.js";
import { FULL_LANE, placeX } from "./layout.js";
import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";

export const FIRE_DURATION = PLAY_DURATION;
export const FIRE_PICKUP_DWELL = 0.4;
export const DOUSE_DWELL = 0.5;

const BUCKET_LEFT = { x: 0.23, y: 0.64 };
const BUCKET_RIGHT = { x: 0.77, y: 0.6 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 */

/**
 * @typedef {object} FireScene
 * @property {"douse-fire"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null }} bucket
 * @property {{ x: number, y: number, stage: number }} fire
 * @property {boolean} dousing
 */

/**
 * @param {() => number} random
 * @param {import("./layout.js").Lane} [lane]
 */
export function layoutFire(random, lane = FULL_LANE) {
  const left = { x: placeX(lane, BUCKET_LEFT.x), y: BUCKET_LEFT.y };
  const right = { x: placeX(lane, BUCKET_RIGHT.x), y: BUCKET_RIGHT.y };
  const flip = random() < 0.5;
  return flip ? { bucket: right, fire: left } : { bucket: left, fire: right };
}

export const DOUSE_FIRE = defineMicrogame({
  id: "douse-fire",
  prompt: "Douse fire",
  backgroundId: "ash",
  duration: FIRE_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FIRE_DURATION;
    let bucket = { x: placeX(lane, BUCKET_LEFT.x), y: BUCKET_LEFT.y };
    let fire = { x: placeX(lane, BUCKET_RIGHT.x), y: BUCKET_RIGHT.y, stage: 0 };
    const carry = createStickyCarry({ pickupDwell: FIRE_PICKUP_DWELL });
    let douseTime = 0;
    let dousing = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /**
     * @returns {MicrogamePlay}
     */
    function api() {
      return {
        start() {
          const next = layoutFire(random, lane);
          bucket = { x: next.bucket.x, y: next.bucket.y };
          fire = { x: next.fire.x, y: next.fire.y, stage: 0 };
          carry.reset(bucket);
          douseTime = 0;
          dousing = false;
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
          const strikers = listIdentifiedStrikers(sample);
          const grip = carry.tick(strikers, step);
          bucket.x = grip.x;
          bucket.y = grip.y;

          if (grip.heldBy) {
            if (overlapsCarry(bucket, fire)) {
              douseTime += step;
              dousing = true;
              if (douseTime >= DOUSE_DWELL) {
                fire.stage = 1;
                outcome = "win";
                return "win";
              }
            } else {
              douseTime = 0;
              dousing = false;
            }
          } else {
            douseTime = 0;
            dousing = false;
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          const aim = outcome === "win" || carry.heldBy ? fire : bucket;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "douse-fire",
              bucket: {
                x: bucket.x,
                y: bucket.y,
                held: Boolean(carry.heldBy),
                offered: carry.offered,
                heldBy: carry.heldBy,
              },
              fire: { x: fire.x, y: fire.y, stage: fire.stage },
              dousing,
            },
          };
        },
      };
    }

    return api();
  },
});
