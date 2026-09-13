/**
 * First real microgame: water the plant.
 * Hover the pot, carry it over the plant, pour. Timeout is the only fail.
 * Sticky-carry uses two-hand offer / one-hand accept so a second hand
 * cannot steal the pot unless the owner offers it.
 */

import { createStickyCarry, overlapsCarry } from "./carry.js";
import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";

export const PLANT_DURATION = PLAY_DURATION;
export const PICKUP_DWELL = 0.4;
export const POUR_DWELL = 0.5;

const POT_LEFT = { x: 0.24, y: 0.66 };
const POT_RIGHT = { x: 0.76, y: 0.58 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 */

/**
 * @typedef {object} WaterScene
 * @property {"water-plant"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null }} pot
 * @property {{ x: number, y: number, stage: number }} plant
 * @property {boolean} pouring
 */

/**
 * @param {() => number} random
 */
export function layoutPlant(random) {
  const flip = random() < 0.5;
  return flip
    ? { pot: { ...POT_RIGHT }, plant: { ...POT_LEFT } }
    : { pot: { ...POT_LEFT }, plant: { ...POT_RIGHT } };
}

export const WATER_PLANT = defineMicrogame({
  id: "water-plant",
  prompt: "Water plant",
  backgroundId: "garden",
  duration: PLANT_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PLANT_DURATION;
    let pot = { x: POT_LEFT.x, y: POT_LEFT.y };
    let plant = { x: POT_RIGHT.x, y: POT_RIGHT.y, stage: 0 };
    const carry = createStickyCarry({ pickupDwell: PICKUP_DWELL });
    let pourTime = 0;
    let pouring = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /**
     * @returns {MicrogamePlay}
     */
    function api() {
      return {
        start() {
          const next = layoutPlant(random);
          pot = { x: next.pot.x, y: next.pot.y };
          plant = { x: next.plant.x, y: next.plant.y, stage: 0 };
          carry.reset(pot);
          pourTime = 0;
          pouring = false;
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
          pot.x = grip.x;
          pot.y = grip.y;

          if (grip.heldBy) {
            if (overlapsCarry(pot, plant)) {
              pourTime += step;
              pouring = true;
              if (pourTime >= POUR_DWELL) {
                plant.stage = 1;
                outcome = "win";
                return "win";
              }
            } else {
              pourTime = 0;
              pouring = false;
            }
          } else {
            pourTime = 0;
            pouring = false;
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          const aim = outcome === "win" || carry.heldBy ? plant : pot;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "water-plant",
              pot: {
                x: pot.x,
                y: pot.y,
                held: Boolean(carry.heldBy),
                offered: carry.offered,
                heldBy: carry.heldBy,
              },
              plant: { x: plant.x, y: plant.y, stage: plant.stage },
              pouring,
            },
          };
        },
      };
    }

    return api();
  },
});
