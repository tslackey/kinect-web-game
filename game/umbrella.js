/**
 * Open the umbrella (#107): both wrists high and spread into a canopy.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { headY, highestY, pairDistance, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const UMBRELLA_DURATION = PLAY_DURATION;
export const UMBRELLA_DWELL = 0.5;
export const UMBRELLA_SPAN = 0.28;

const LEFT_POST = { x: 0.28, y: 0.16 };
const RIGHT_POST = { x: 0.72, y: 0.16 };

/**
 * @typedef {object} UmbrellaScene
 * @property {"open-umbrella"} kind
 * @property {{ x: number, y: number, held: boolean }} left
 * @property {{ x: number, y: number, held: boolean }} right
 * @property {boolean} open
 */

export const OPEN_UMBRELLA = defineMicrogame({
  id: "open-umbrella",
  prompt: "Umbrella!",
  backgroundId: "span",
  duration: UMBRELLA_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : UMBRELLA_DURATION;
    const left = { x: placeX(lane, LEFT_POST.x), y: LEFT_POST.y };
    const right = { x: placeX(lane, RIGHT_POST.x), y: RIGHT_POST.y };
    let leftHit = false;
    let rightHit = false;
    let held = 0;
    let open = false;

    return createTimedPlay({
      lifetime,
      reset() {
        leftHit = false;
        rightHit = false;
        held = 0;
        open = false;
      },
      step(dt, sample) {
        const canopy = somePose(sample, (pose) => {
          const high = highestY(pose, ["left_wrist", "right_wrist", "pointer"]);
          if (high == null) return false;
          const pointer = pose.joints?.pointer;
          if (pointer && (pointer.confidence ?? 1) >= 0.4 && pointer.y <= 0.2) {
            leftHit = true;
            rightHit = true;
            return true;
          }
          const span = pairDistance(pose, "left_wrist", "right_wrist");
          return high <= headY(pose) - 0.02 && span != null && span >= UMBRELLA_SPAN;
        });
        const strikers = listIdentifiedStrikers(sample);
        if (strikers.some((joint) => near(joint, left))) leftHit = true;
        if (strikers.some((joint) => near(joint, right))) rightHit = true;
        open = canopy || (leftHit && rightHit);
        held = open ? held + dt : 0;
        return held >= UMBRELLA_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: right.x, y: right.y, vx: 0, vy: 0 },
          scene: {
            kind: "open-umbrella",
            left: { ...left, held: leftHit },
            right: { ...right, held: rightHit },
            open,
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
