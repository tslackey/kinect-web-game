/**
 * Freeze dance (#85): keep moving, then hold still when Freeze! flashes.
 * Moving after the cue, or never moving in the windup, fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { posesFromSample } from "../input/poses.js";
import { createTimedPlay } from "./timed.js";
import { poseTravel } from "./body.js";

export const FREEZE_DURATION = PLAY_DURATION;
export const FREEZE_CUE_AT = 3.4;
export const FREEZE_DWELL = 0.6;
/** Brief beat after the cue before stillness is judged. */
export const FREEZE_GRACE = 0.18;
/** Travel per second that counts as dancing. */
export const FREEZE_MOVE = 0.22;
/** Travel per second that breaks the freeze. */
export const FREEZE_STILL = 0.09;

const MOTION_NAMES = ["left_wrist", "right_wrist", "left_hip", "right_hip", "pointer"];

/**
 * @typedef {object} FreezeScene
 * @property {"freeze-dance"} kind
 * @property {boolean} cue
 * @property {boolean} danced
 * @property {boolean} frozen
 */

export const FREEZE_DANCE = defineMicrogame({
  id: "freeze-dance",
  prompt: "Freeze!",
  backgroundId: "cue",
  duration: FREEZE_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : FREEZE_DURATION;
    /** @type {Map<string, { x: number, y: number }>} */
    const last = new Map();
    let elapsed = 0;
    let danced = false;
    let still = 0;
    let frozen = false;

    return createTimedPlay({
      lifetime,
      reset() {
        last.clear();
        elapsed = 0;
        danced = false;
        still = 0;
        frozen = false;
      },
      step(dt, sample) {
        elapsed += dt;
        const travel = posesFromSample(sample).reduce((sum, pose) => sum + poseTravel(pose, MOTION_NAMES, last), 0);
        const rate = dt > 0 ? travel / dt : 0;
        const cue = elapsed >= FREEZE_CUE_AT;

        if (!cue) {
          if (rate >= FREEZE_MOVE) danced = true;
          return "playing";
        }
        if (!danced) return "fail";
        if (elapsed < FREEZE_CUE_AT + FREEZE_GRACE) return "playing";
        if (rate > FREEZE_STILL) return "fail";
        still += dt;
        frozen = still >= FREEZE_DWELL;
        return frozen ? "win" : "playing";
      },
      view() {
        const cue = elapsed >= FREEZE_CUE_AT;
        return {
          target: { id: 1, x: 0.5, y: 0.42, vx: 0, vy: 0 },
          scene: { kind: "freeze-dance", cue, danced, frozen },
        };
      },
    });
  },
});
