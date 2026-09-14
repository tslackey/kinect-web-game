/**
 * Hop on one foot (#110): raise one ankle and hold. Distinct from Jump the bar.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { jointOf, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const HOP_DURATION = PLAY_DURATION;
export const HOP_DWELL = 0.8;
export const HOP_LIFT = 0.12;

/**
 * @typedef {object} HopScene
 * @property {"hop-foot"} kind
 * @property {boolean} hopping
 */

export const HOP_FOOT = defineMicrogame({
  id: "hop-foot",
  prompt: "Hop!",
  backgroundId: "bar",
  duration: HOP_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : HOP_DURATION;
    let held = 0;
    let hopping = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        hopping = false;
      },
      step(dt, sample) {
        hopping = somePose(sample, stork);
        held = hopping ? held + dt : 0;
        return held >= HOP_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.62, vx: 0, vy: 0 },
          scene: { kind: "hop-foot", hopping },
        };
      },
    });
  },
});

/**
 * @param {import("../input/poses.js").PoseMap} pose
 */
function stork(pose) {
  const pointer = jointOf(pose, "pointer");
  const left = jointOf(pose, "left_ankle");
  const right = jointOf(pose, "right_ankle");
  if (pointer && !left && !right) return pointer.y <= 0.42;
  if (!left || !right) return false;
  return Math.abs(left.y - right.y) >= HOP_LIFT;
}
