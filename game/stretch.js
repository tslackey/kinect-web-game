/**
 * Stretch wide (#32): wrist–wrist distance past a span, or visit both
 * side posts with a pointer / keyboard stand-in.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { pairDistance, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const STRETCH_DURATION = PLAY_DURATION;
export const STRETCH_SPAN = 0.52;

const LEFT_POST = { x: 0.16, y: 0.42 };
const RIGHT_POST = { x: 0.84, y: 0.42 };

/**
 * @typedef {object} StretchScene
 * @property {"stretch-wide"} kind
 * @property {{ x: number, y: number, held: boolean }} left
 * @property {{ x: number, y: number, held: boolean }} right
 * @property {boolean} wide
 */

export const STRETCH_WIDE = defineMicrogame({
  id: "stretch-wide",
  prompt: "Stretch wide",
  backgroundId: "span",
  duration: STRETCH_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : STRETCH_DURATION;
    let leftHit = false;
    let rightHit = false;
    let wide = false;

    return createTimedPlay({
      lifetime,
      reset() {
        leftHit = false;
        rightHit = false;
        wide = false;
      },
      step(_dt, sample) {
        const hands = somePose(sample, (pose) => {
          const span = pairDistance(pose, "left_wrist", "right_wrist");
          return span != null && span >= STRETCH_SPAN;
        });
        const strikers = listIdentifiedStrikers(sample);
        if (strikers.some((joint) => near(joint, LEFT_POST))) leftHit = true;
        if (strikers.some((joint) => near(joint, RIGHT_POST))) rightHit = true;
        wide = hands || (leftHit && rightHit);
        return wide ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: RIGHT_POST.x, y: RIGHT_POST.y, vx: 0, vy: 0 },
          scene: {
            kind: "stretch-wide",
            left: { ...LEFT_POST, held: leftHit },
            right: { ...RIGHT_POST, held: rightHit },
            wide,
          },
        };
      },
    });
  },
});

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function near(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}
