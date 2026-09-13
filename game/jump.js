/**
 * Jump the bar (#27): hip / nose height spike, or crossing above the bar.
 * Pointer / keyboard: move above the bar. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { highestY, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const JUMP_DURATION = PLAY_DURATION;
export const BAR_Y = 0.2;
export const JUMP_SPIKE = 0.11;

const HEIGHT_NAMES = ["left_hip", "right_hip", "nose", "pointer"];

/**
 * @typedef {object} JumpScene
 * @property {"jump-bar"} kind
 * @property {{ y: number }} bar
 * @property {boolean} cleared
 */

export const JUMP_BAR = defineMicrogame({
  id: "jump-bar",
  prompt: "Jump bar",
  backgroundId: "bar",
  duration: JUMP_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : JUMP_DURATION;
    /** @type {Map<string, number>} */
    const lastY = new Map();
    let cleared = false;

    return createTimedPlay({
      lifetime,
      reset() {
        lastY.clear();
        cleared = false;
      },
      step(_dt, sample) {
        cleared = somePose(sample, (pose) => {
          const high = highestY(pose, HEIGHT_NAMES);
          if (high == null) return false;
          if (high <= BAR_Y) return true;
          const prev = lastY.get(pose.id);
          lastY.set(pose.id, high);
          return prev != null && prev - high >= JUMP_SPIKE;
        });
        return cleared ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: BAR_Y, vx: 0, vy: 0 },
          scene: { kind: "jump-bar", bar: { y: BAR_Y }, cleared },
        };
      },
    });
  },
});
