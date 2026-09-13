/**
 * Hot potato (#39): sticky pass via two-hand offer / one-hand accept.
 * Prompt `Pass!`. Potato sticks to one hand; a second hand cannot steal
 * without an offer. Solo: pass between left and right. Win = at least
 * one successful offer/accept pass before the timer.
 */

import { createStickyCarry } from "./carry.js";
import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";

export const POTATO_DURATION = PLAY_DURATION;
export const POTATO_PICKUP_DWELL = 0.4;
/** Wins need this many offer/accept transfers. Initial pickup is not a pass. */
export const POTATO_PASSES = 1;

const POTATO_LEFT = { x: 0.28, y: 0.58 };
const POTATO_RIGHT = { x: 0.72, y: 0.52 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 */

/**
 * @typedef {object} PotatoScene
 * @property {"hot-potato"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null }} potato
 * @property {number} passes Successful offer/accept transfers this play.
 */

/**
 * @param {() => number} random
 */
export function layoutPotato(random) {
  return random() < 0.5 ? { ...POTATO_RIGHT } : { ...POTATO_LEFT };
}

export const HOT_POTATO = defineMicrogame({
  id: "hot-potato",
  prompt: "Pass!",
  backgroundId: "hearth",
  duration: POTATO_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : POTATO_DURATION;
    let potato = { x: POTATO_LEFT.x, y: POTATO_LEFT.y };
    const carry = createStickyCarry({ pickupDwell: POTATO_PICKUP_DWELL });
    let passes = 0;
    /** @type {string | null} */
    let lastHeld = null;

    return createTimedPlay({
      lifetime,
      reset() {
        potato = layoutPotato(random);
        carry.reset(potato);
        passes = 0;
        lastHeld = null;
      },
      step(dt, sample) {
        const strikers = listIdentifiedStrikers(sample);
        const grip = carry.tick(strikers, dt);
        potato.x = grip.x;
        potato.y = grip.y;
        if (grip.heldBy && lastHeld && grip.heldBy !== lastHeld) {
          passes += 1;
        }
        if (grip.heldBy) lastHeld = grip.heldBy;
        return passes >= POTATO_PASSES ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: potato.x, y: potato.y, vx: 0, vy: 0 },
          scene: {
            kind: "hot-potato",
            potato: {
              x: potato.x,
              y: potato.y,
              held: Boolean(carry.heldBy),
              offered: carry.offered,
              heldBy: carry.heldBy,
            },
            passes,
          },
        };
      },
    });
  },
});
