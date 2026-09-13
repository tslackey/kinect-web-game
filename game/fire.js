/**
 * Third real microgame: put out the fire.
 * Hover the bucket, carry it over the flame, douse. Timeout is the only fail.
 * Same sticky-carry + dual-zone grammar as Water the plant and Feed the pet.
 */

import { defineMicrogame } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const FIRE_DURATION = 5.5;
export const FIRE_PICKUP_DWELL = 0.4;
export const DOUSE_DWELL = 0.5;

const BUCKET_LEFT = { x: 0.23, y: 0.64 };
const BUCKET_RIGHT = { x: 0.77, y: 0.6 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} FireScene
 * @property {"douse-fire"} kind
 * @property {{ x: number, y: number, held: boolean }} bucket
 * @property {{ x: number, y: number, stage: number }} fire
 * @property {boolean} dousing
 */

/**
 * @param {() => number} random
 */
export function layoutFire(random) {
  const flip = random() < 0.5;
  return flip
    ? { bucket: { ...BUCKET_RIGHT }, fire: { ...BUCKET_LEFT } }
    : { bucket: { ...BUCKET_LEFT }, fire: { ...BUCKET_RIGHT } };
}

export const DOUSE_FIRE = defineMicrogame({
  id: "douse-fire",
  prompt: "Douse fire",
  duration: FIRE_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FIRE_DURATION;
    let bucket = { x: BUCKET_LEFT.x, y: BUCKET_LEFT.y };
    let fire = { x: BUCKET_RIGHT.x, y: BUCKET_RIGHT.y, stage: 0 };
    /** @type {string | null} */
    let heldBy = null;
    /** @type {Map<string, number>} */
    const hover = new Map();
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
          const next = layoutFire(random);
          bucket = { x: next.bucket.x, y: next.bucket.y };
          fire = { x: next.fire.x, y: next.fire.y, stage: 0 };
          heldBy = null;
          hover.clear();
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

          if (heldBy) {
            followHeld(strikers);
            if (overlaps(bucket, fire)) {
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
            updateHover(strikers, step);
            const attached = strikers.find((striker) => (hover.get(striker.id) ?? 0) >= FIRE_PICKUP_DWELL);
            if (attached) {
              heldBy = attached.id;
              bucket.x = attached.x;
              bucket.y = attached.y;
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
          const aim = outcome === "win" || heldBy ? fire : bucket;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "douse-fire",
              bucket: { x: bucket.x, y: bucket.y, held: Boolean(heldBy) },
              fire: { x: fire.x, y: fire.y, stage: fire.stage },
              dousing,
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
      bucket.x = hand.x;
      bucket.y = hand.y;
    }

    /**
     * @param {IdentifiedStriker[]} strikers
     * @param {number} step
     */
    function updateHover(strikers, step) {
      const seen = new Set();
      for (const striker of strikers) {
        seen.add(striker.id);
        const over = overlaps(striker, bucket);
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
