/**
 * Wave hello (#36): wrist above the head, held for a short dwell.
 * Pointer / keyboard: hold high. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { highestY, headY, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const WAVE_DURATION = PLAY_DURATION;
export const WAVE_DWELL = 0.45;
export const WAVE_CLEARANCE = 0.04;
export const WAVE_POINTER_Y = 0.2;

const WAVE_NAMES = ["left_wrist", "right_wrist", "pointer"];

/**
 * @typedef {object} WaveScene
 * @property {"wave-hello"} kind
 * @property {boolean} waving
 * @property {number} held
 */

export const WAVE_HELLO = defineMicrogame({
  id: "wave-hello",
  prompt: "Wave hello",
  backgroundId: "hello",
  duration: WAVE_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : WAVE_DURATION;
    let held = 0;
    let waving = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        waving = false;
      },
      step(dt, sample) {
        waving = somePose(sample, (pose) => {
          const high = highestY(pose, WAVE_NAMES);
          if (high == null) return false;
          const pointer = pose.joints?.pointer;
          if (pointer && (pointer.confidence ?? 1) >= 0.4 && pointer.y <= WAVE_POINTER_Y) {
            return true;
          }
          return high <= headY(pose) - WAVE_CLEARANCE;
        });
        held = waving ? held + dt : 0;
        return held >= WAVE_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.16, vx: 0, vy: 0 },
          scene: { kind: "wave-hello", waving, held },
        };
      },
    });
  },
});
