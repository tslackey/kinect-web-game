/**
 * Second real microgame: feed the pet.
 * Hover the bowl, carry it over the pet, feed. Timeout is the only fail.
 * Same sticky-carry + dual-zone grammar as Water the plant, including
 * two-hand offer / one-hand accept.
 */

import { createStickyCarry, overlapsCarry } from "./carry.js";
import { FULL_LANE, placeX } from "./layout.js";
import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";

export const PET_DURATION = PLAY_DURATION;
export const PET_PICKUP_DWELL = 0.4;
export const FEED_DWELL = 0.5;

const BOWL_LEFT = { x: 0.22, y: 0.68 };
const BOWL_RIGHT = { x: 0.78, y: 0.56 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 */

/**
 * @typedef {object} FeedScene
 * @property {"feed-pet"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null }} bowl
 * @property {{ x: number, y: number, stage: number }} pet
 * @property {boolean} feeding
 */

/**
 * @param {() => number} random
 * @param {import("./layout.js").Lane} [lane]
 */
export function layoutPet(random, lane = FULL_LANE) {
  const left = { x: placeX(lane, BOWL_LEFT.x), y: BOWL_LEFT.y };
  const right = { x: placeX(lane, BOWL_RIGHT.x), y: BOWL_RIGHT.y };
  const flip = random() < 0.5;
  return flip ? { bowl: right, pet: left } : { bowl: left, pet: right };
}

export const FEED_PET = defineMicrogame({
  id: "feed-pet",
  prompt: "Feed pet",
  backgroundId: "hearth",
  duration: PET_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PET_DURATION;
    let bowl = { x: placeX(lane, BOWL_LEFT.x), y: BOWL_LEFT.y };
    let pet = { x: placeX(lane, BOWL_RIGHT.x), y: BOWL_RIGHT.y, stage: 0 };
    const carry = createStickyCarry({ pickupDwell: PET_PICKUP_DWELL });
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
          const next = layoutPet(random, lane);
          bowl = { x: next.bowl.x, y: next.bowl.y };
          pet = { x: next.pet.x, y: next.pet.y, stage: 0 };
          carry.reset(bowl);
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
          const grip = carry.tick(strikers, step);
          bowl.x = grip.x;
          bowl.y = grip.y;

          if (grip.heldBy) {
            if (overlapsCarry(bowl, pet)) {
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
            feedTime = 0;
            feeding = false;
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          const aim = outcome === "win" || carry.heldBy ? pet : bowl;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "feed-pet",
              bowl: {
                x: bowl.x,
                y: bowl.y,
                held: Boolean(carry.heldBy),
                offered: carry.offered,
                heldBy: carry.heldBy,
              },
              pet: { x: pet.x, y: pet.y, stage: pet.stage },
              feeding,
            },
          };
        },
      };
    }

    return api();
  },
});
