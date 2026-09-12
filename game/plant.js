/**
 * First real microgame: water the plant.
 * Hover the pot, carry it over the plant, pour. Timeout is the only fail.
 */

import { defineMicrogame } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const PLANT_DURATION = 5.5;
export const PICKUP_DWELL = 0.4;
export const POUR_DWELL = 0.5;

const POT_LEFT = { x: 0.24, y: 0.66 };
const POT_RIGHT = { x: 0.76, y: 0.58 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} WaterScene
 * @property {"water-plant"} kind
 * @property {{ x: number, y: number, held: boolean }} pot
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
  duration: PLANT_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PLANT_DURATION;
    let pot = { x: POT_LEFT.x, y: POT_LEFT.y };
    let plant = { x: POT_RIGHT.x, y: POT_RIGHT.y, stage: 0 };
    /** @type {string | null} */
    let heldBy = null;
    /** @type {Map<string, number>} */
    const hover = new Map();
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
          heldBy = null;
          hover.clear();
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

          if (heldBy) {
            followHeld(strikers);
            if (overlaps(pot, plant)) {
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
            updateHover(strikers, step);
            const attached = strikers.find((striker) => (hover.get(striker.id) ?? 0) >= PICKUP_DWELL);
            if (attached) {
              heldBy = attached.id;
              pot.x = attached.x;
              pot.y = attached.y;
            }
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          const aim = outcome === "win" || heldBy ? plant : pot;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "water-plant",
              pot: { x: pot.x, y: pot.y, held: Boolean(heldBy) },
              plant: { x: plant.x, y: plant.y, stage: plant.stage },
              pouring,
            },
          };
        },
      };
    }

    /**
     * @param {IdentifiedStriker[]} strikers
     */
    function followHeld(strikers) {
      const hand = strikers.find((striker) => striker.id === heldBy);
      if (!hand) return;
      pot.x = hand.x;
      pot.y = hand.y;
    }

    /**
     * @param {IdentifiedStriker[]} strikers
     * @param {number} step
     */
    function updateHover(strikers, step) {
      const seen = new Set();
      for (const striker of strikers) {
        seen.add(striker.id);
        const over = overlaps(striker, pot);
        hover.set(striker.id, over ? (hover.get(striker.id) ?? 0) + step : 0);
      }
      for (const id of hover.keys()) {
        if (!seen.has(id)) hover.set(id, 0);
      }
    }

    return api();
  },
});

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function overlaps(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}
