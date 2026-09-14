/**
 * Skip rope (#116): hop over the rope as it swings. Trip (no jump on beat)
 * or timeout fails. Sibling to Jump the bar / Limbo.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { highestY, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const SKIP_DURATION = PLAY_DURATION;
export const SKIP_COUNT = 2;
export const SKIP_SPIKE = 0.08;
export const SKIP_PERIOD = 1.35;

const HEIGHT_NAMES = ["left_hip", "right_hip", "nose", "pointer"];

/**
 * @typedef {object} SkipScene
 * @property {"skip-rope"} kind
 * @property {{ y: number }} rope
 * @property {number} skips
 * @property {boolean} jumping
 */

export const SKIP_ROPE = defineMicrogame({
  id: "skip-rope",
  prompt: "Skip!",
  backgroundId: "bar",
  duration: SKIP_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : SKIP_DURATION;
    /** @type {Map<string, number>} */
    const lastY = new Map();
    let elapsed = 0;
    let skips = 0;
    let armed = false;
    let jumping = false;
    let lastBeat = -1;

    return createTimedPlay({
      lifetime,
      reset() {
        lastY.clear();
        elapsed = 0;
        skips = 0;
        armed = false;
        jumping = false;
        lastBeat = -1;
      },
      step(dt, sample) {
        elapsed += dt;
        const phase = (elapsed / SKIP_PERIOD) % 1;
        const beat = Math.floor(elapsed / SKIP_PERIOD);
        jumping = somePose(sample, (pose) => {
          const high = highestY(pose, HEIGHT_NAMES);
          if (high == null) return false;
          const prev = lastY.get(pose.id);
          lastY.set(pose.id, high);
          if (high <= 0.28) return true;
          return prev != null && prev - high >= SKIP_SPIKE;
        });
        if (jumping) armed = true;

        const passing = phase > 0.45 && phase < 0.58;
        if (passing && beat !== lastBeat && beat >= 1) {
          lastBeat = beat;
          if (!armed) return "fail";
          skips += 1;
          armed = false;
          if (skips >= SKIP_COUNT) return "win";
        }
        return "playing";
      },
      view() {
        const phase = (elapsed / SKIP_PERIOD) % 1;
        const ropeY = 0.42 + Math.sin(phase * Math.PI * 2) * 0.22;
        return {
          target: { id: 1, x: 0.5, y: ropeY, vx: 0, vy: 0 },
          scene: { kind: "skip-rope", rope: { y: ropeY }, skips, jumping },
        };
      },
    });
  },
});
