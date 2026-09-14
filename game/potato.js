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
import { LAYOUT_COOP } from "./layout.js";

export const POTATO_DURATION = PLAY_DURATION;
export const POTATO_PICKUP_DWELL = 0.4;
/** Wins need this many offer/accept transfers. Initial pickup is not a pass. */
export const POTATO_PASSES = 1;

const POTATO_CENTER = { x: 0.5, y: 0.55 };

/**
 * Shared potato lives in the middle. Coop-center — not a split copy.
 *
 * @param {() => number} [_random]
 */
export function layoutPotato(_random) {
  return { ...POTATO_CENTER };
}

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 */

/**
 * @typedef {object} PotatoScene
 * @property {"hot-potato"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null }} potato
 * @property {number} passes Successful offer/accept transfers this play.
 */

export const HOT_POTATO = defineMicrogame({
  id: "hot-potato",
  prompt: "Pass!",
  backgroundId: "pass",
  layout: LAYOUT_COOP,
  duration: POTATO_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : POTATO_DURATION;
    let potato = { x: POTATO_CENTER.x, y: POTATO_CENTER.y };
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
