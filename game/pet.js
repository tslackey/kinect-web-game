/**
 * Second real microgame: feed the pet.
 * Hover the bowl, carry it over the pet, feed. Timeout is the only fail.
 * Same sticky-carry + dual-zone grammar as Water the plant.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const PET_DURATION = PLAY_DURATION;
export const PET_PICKUP_DWELL = 0.4;
export const FEED_DWELL = 0.5;

const BOWL_LEFT = { x: 0.22, y: 0.68 };
const BOWL_RIGHT = { x: 0.78, y: 0.56 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} FeedScene
 * @property {"feed-pet"} kind
 * @property {{ x: number, y: number, held: boolean }} bowl
 * @property {{ x: number, y: number, stage: number }} pet
 * @property {boolean} feeding
 */

/**
 * @param {() => number} random
 */
export function layoutPet(random) {
  const flip = random() < 0.5;
  return flip
    ? { bowl: { ...BOWL_RIGHT }, pet: { ...BOWL_LEFT } }
    : { bowl: { ...BOWL_LEFT }, pet: { ...BOWL_RIGHT } };
}

export const FEED_PET = defineMicrogame({
  id: "feed-pet",
  prompt: "Feed pet",
  duration: PET_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PET_DURATION;
    let bowl = { x: BOWL_LEFT.x, y: BOWL_LEFT.y };
    let pet = { x: BOWL_RIGHT.x, y: BOWL_RIGHT.y, stage: 0 };
    /** @type {string | null} */
    let heldBy = null;
    /** @type {Map<string, number>} */
    const hover = new Map();
    let feedTime = 0;
    let feeding = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /**
     * @returns {MicrogamePlay}
     */
    function api() {
      return {
        start() {
          const next = layoutPet(random);
          bowl = { x: next.bowl.x, y: next.bowl.y };
          pet = { x: next.pet.x, y: next.pet.y, stage: 0 };
          heldBy = null;
          hover.clear();
          feedTime = 0;
          feeding = false;
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
            if (overlaps(bowl, pet)) {
              feedTime += step;
              feeding = true;
              if (feedTime >= FEED_DWELL) {
                pet.stage = 1;
                outcome = "win";
                return "win";
              }
            } else {
              feedTime = 0;
              feeding = false;
            }
          } else {
            updateHover(strikers, step);
            const attached = strikers.find((striker) => (hover.get(striker.id) ?? 0) >= PET_PICKUP_DWELL);
            if (attached) {
              heldBy = attached.id;
              bowl.x = attached.x;
              bowl.y = attached.y;
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
          const aim = outcome === "win" || heldBy ? pet : bowl;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "feed-pet",
              bowl: { x: bowl.x, y: bowl.y, held: Boolean(heldBy) },
              pet: { x: pet.x, y: pet.y, stage: pet.stage },
              feeding,
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
      bowl.x = hand.x;
      bowl.y = hand.y;
    }

    /**
     * @param {IdentifiedStriker[]} strikers
     * @param {number} step
     */
    function updateHover(strikers, step) {
      const seen = new Set();
      for (const striker of strikers) {
        seen.add(striker.id);
        const over = overlaps(striker, bowl);
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
