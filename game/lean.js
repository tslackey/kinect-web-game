/**
 * Lean away (#29): shift the torso toward a marked side.
 * Pointer / keyboard: move to that side. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { somePose, torsoX } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const LEAN_DURATION = PLAY_DURATION;
export const LEAN_EDGE = 0.34;

/**
 * @typedef {object} LeanScene
 * @property {"lean-away"} kind
 * @property {"left" | "right"} side
 * @property {boolean} leaned
 */

export const LEAN_AWAY = defineMicrogame({
  id: "lean-away",
  prompt: "Lean away",
  backgroundId: "tilt",
  duration: LEAN_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : LEAN_DURATION;
    /** @type {"left" | "right"} */
    let side = "right";
    let leaned = false;

    return createTimedPlay({
      lifetime,
      reset() {
        side = random() < 0.5 ? "left" : "right";
        leaned = false;
      },
      step(_dt, sample) {
        leaned = somePose(sample, (pose) => {
          const x = torsoX(pose);
          if (x == null) return false;
          return side === "left" ? x <= LEAN_EDGE : x >= 1 - LEAN_EDGE;
        });
        return leaned ? "win" : "playing";
      },
      view() {
        const x = side === "left" ? 0.18 : 0.82;
        return {
          target: { id: 1, x, y: 0.46, vx: 0, vy: 0 },
          scene: { kind: "lean-away", side, leaned },
        };
      },
    });
  },
});
