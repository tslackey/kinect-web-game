/**
 * Bow to the king (#87): fold forward at the waist. Not a left/right lean.
 * Pointer: move down. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { somePose, torsoFolded } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const BOW_DURATION = PLAY_DURATION;
export const BOW_DWELL = 0.35;

/**
 * @typedef {object} BowScene
 * @property {"bow-king"} kind
 * @property {boolean} bowed
 */

export const BOW_KING = defineMicrogame({
  id: "bow-king",
  prompt: "Bow!",
  backgroundId: "tilt",
  duration: BOW_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BOW_DURATION;
    let held = 0;
    let bowed = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        bowed = false;
      },
      step(dt, sample) {
        bowed = somePose(sample, (pose) => torsoFolded(pose));
        held = bowed ? held + dt : 0;
        return held >= BOW_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.62, vx: 0, vy: 0 },
          scene: { kind: "bow-king", bowed },
        };
      },
    });
  },
});
