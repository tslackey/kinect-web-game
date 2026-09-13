/**
 * High five (#33): wrist into a high zone (orb-like).
 * Pointer / keyboard still plays. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";

export const HIGH_FIVE_DURATION = PLAY_DURATION;
const ZONE = { x: 0.72, y: 0.18 };

/**
 * @typedef {object} HighFiveScene
 * @property {"high-five"} kind
 * @property {{ x: number, y: number }} zone
 * @property {boolean} slapped
 */

export const HIGH_FIVE = defineMicrogame({
  id: "high-five",
  prompt: "High five",
  backgroundId: "high",
  duration: HIGH_FIVE_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : HIGH_FIVE_DURATION;
    let slapped = false;

    return createTimedPlay({
      lifetime,
      reset() {
        slapped = false;
      },
      step(_dt, sample) {
        slapped = listIdentifiedStrikers(sample).some((joint) => near(joint, ZONE));
        return slapped ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: ZONE.x, y: ZONE.y, vx: 0, vy: 0 },
          scene: { kind: "high-five", zone: { ...ZONE }, slapped },
        };
      },
    });
  },
});

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function near(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}
