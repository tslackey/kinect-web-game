/**
 * Flap your wings (#106): both arms rise and fall N times.
 * Distinct from Stretch wide (static span) and Wave (one hand).
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { highestY, somePose } from "./body.js";

export const FLAP_DURATION = PLAY_DURATION;
export const FLAP_COUNT = 3;
export const FLAP_TRAVEL = 0.12;

const WING_NAMES = ["left_wrist", "right_wrist", "pointer"];

/**
 * @typedef {object} FlapScene
 * @property {"flap-wings"} kind
 * @property {number} flaps
 * @property {boolean} flapping
 */

export const FLAP_WINGS = defineMicrogame({
  id: "flap-wings",
  prompt: "Flap!",
  backgroundId: "span",
  duration: FLAP_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FLAP_DURATION;
    let lastY = null;
    let dir = 0;
    let origin = 0;
    let flaps = 0;
    let flapping = false;

    return createTimedPlay({
      lifetime,
      reset() {
        lastY = null;
        dir = 0;
        origin = 0;
        flaps = 0;
        flapping = false;
      },
      step(_dt, sample) {
        const y = wingY(sample);
        flapping = y != null;
        if (y == null) {
          lastY = null;
          return "playing";
        }
        if (lastY == null) {
          lastY = y;
          origin = y;
          return "playing";
        }
        const dy = y - lastY;
        if (Math.abs(dy) >= 0.002) {
          const next = dy > 0 ? 1 : -1;
          if (dir === 0) {
            dir = next;
            origin = lastY;
          } else if (next !== dir) {
            if (Math.abs(lastY - origin) >= FLAP_TRAVEL) flaps += 1;
            dir = next;
            origin = lastY;
          }
        }
        lastY = y;
        return flaps >= FLAP_COUNT ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.28, vx: 0, vy: 0 },
          scene: { kind: "flap-wings", flaps, flapping },
        };
      },
    });
  },
});

/**
 * @param {import("../input/poses.js").PoseSample} sample
 */
function wingY(sample) {
  let best = null;
  somePose(sample, (pose) => {
    const high = highestY(pose, WING_NAMES);
    if (high != null) best = best == null ? high : Math.min(best, high);
    return false;
  });
  if (best != null) return best;
  const hands = listIdentifiedStrikers(sample);
  if (hands.length === 0) return null;
  return hands.reduce((sum, joint) => sum + joint.y, 0) / hands.length;
}
