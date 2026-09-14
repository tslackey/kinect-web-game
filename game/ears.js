/**
 * Cover your ears (#88): both wrists to the sides of the head.
 * Distinct from Squash it (center zone) and Wave (one hand high).
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { bothHandsAtHead, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const EARS_DURATION = PLAY_DURATION;
export const EARS_DWELL = 0.4;

/**
 * @typedef {object} EarsScene
 * @property {"cover-ears"} kind
 * @property {boolean} covering
 */

export const COVER_EARS = defineMicrogame({
  id: "cover-ears",
  prompt: "Cover!",
  backgroundId: "hello",
  duration: EARS_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : EARS_DURATION;
    let held = 0;
    let covering = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        covering = false;
      },
      step(dt, sample) {
        covering = somePose(sample, (pose) => bothHandsAtHead(pose, { dx: 0.09, dy: 0.02, radius: 0.16 }));
        held = covering ? held + dt : 0;
        return held >= EARS_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.22, vx: 0, vy: 0 },
          scene: { kind: "cover-ears", covering },
        };
      },
    });
  },
});
