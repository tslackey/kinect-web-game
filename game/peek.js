/**
 * Peek with binoculars (#91): both wrists to the eyes / face.
 * Higher and more forward than Cover ears. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { bothHandsAtHead, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const PEEK_DURATION = PLAY_DURATION;
export const PEEK_DWELL = 0.5;

/**
 * @typedef {object} PeekScene
 * @property {"peek-binoculars"} kind
 * @property {boolean} peeking
 */

export const PEEK_BINOCULARS = defineMicrogame({
  id: "peek-binoculars",
  prompt: "Peek!",
  backgroundId: "hello",
  duration: PEEK_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PEEK_DURATION;
    let held = 0;
    let peeking = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        peeking = false;
      },
      step(dt, sample) {
        peeking = somePose(sample, (pose) => bothHandsAtHead(pose, { dx: 0.05, dy: -0.02, radius: 0.14 }));
        held = peeking ? held + dt : 0;
        return held >= PEEK_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.2, vx: 0, vy: 0 },
          scene: { kind: "peek-binoculars", peeking },
        };
      },
    });
  },
});
