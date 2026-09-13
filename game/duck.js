/**
 * Duck the beam (#26): hip / nose (or pointer) below a height threshold.
 * Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { highestY, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const DUCK_DURATION = PLAY_DURATION;
export const BEAM_Y = 0.48;
export const DUCK_CLEARANCE = 0.02;

const HEIGHT_NAMES = ["nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip", "pointer"];

/**
 * @typedef {object} DuckScene
 * @property {"duck-beam"} kind
 * @property {{ y: number }} beam
 * @property {boolean} ducked
 */

export const DUCK_BEAM = defineMicrogame({
  id: "duck-beam",
  prompt: "Duck beam",
  backgroundId: "beam",
  duration: DUCK_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : DUCK_DURATION;
    let ducked = false;

    return createTimedPlay({
      lifetime,
      reset() {
        ducked = false;
      },
      step(_dt, sample) {
        ducked = somePose(sample, (pose) => {
          const top = highestY(pose, HEIGHT_NAMES);
          return top != null && top >= BEAM_Y + DUCK_CLEARANCE;
        });
        return ducked ? "win" : "playing";
      },
      view() {
        const y = BEAM_Y;
        return {
          target: { id: 1, x: 0.5, y, vx: 0, vy: 0 },
          scene: { kind: "duck-beam", beam: { y }, ducked },
        };
      },
    });
  },
});
