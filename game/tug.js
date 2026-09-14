/**
 * Tug of war (#114): shared rope; both pull toward their sides.
 * Kids coop: shared team pull distance, not a competitive win line.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { posesFromSample } from "../input/poses.js";
import { createTimedPlay } from "./timed.js";
import { LAYOUT_COOP } from "./layout.js";

export const TUG_DURATION = PLAY_DURATION;
export const TUG_PULL = 0.16;

const ROPE = { x: 0.5, y: 0.48 };
const LEFT_END = { x: 0.32, y: 0.48 };
const RIGHT_END = { x: 0.68, y: 0.48 };

/**
 * @typedef {object} TugScene
 * @property {"tug-of-war"} kind
 * @property {{ x: number, y: number }} rope
 * @property {number} pulled
 * @property {boolean} tugging
 */

export const TUG_OF_WAR = defineMicrogame({
  id: "tug-of-war",
  prompt: "Tug!",
  backgroundId: "pass",
  layout: LAYOUT_COOP,
  duration: TUG_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : TUG_DURATION;
    let pulled = 0;
    let lastLeft = null;
    let lastRight = null;
    let tugging = false;

    return createTimedPlay({
      lifetime,
      reset() {
        pulled = 0;
        lastLeft = null;
        lastRight = null;
        tugging = false;
      },
      step(_dt, sample) {
        const poses = posesFromSample(sample);
        const leftHand = grab(poses[0], LEFT_END) ?? grabSolo(sample, LEFT_END);
        const rightHand = grab(poses[1], RIGHT_END) ?? grabSolo(sample, RIGHT_END);
        const pointer = listIdentifiedStrikers(sample).find((joint) => joint.name === "pointer" && near(joint, ROPE));
        tugging = Boolean((leftHand && rightHand) || pointer);

        if (pointer && poses.length < 2) {
          if (lastLeft != null) pulled += Math.abs(pointer.x - lastLeft);
          lastLeft = pointer.x;
        } else if (leftHand && rightHand) {
          const leftTravel = lastLeft == null ? 0 : Math.max(0, lastLeft - leftHand.x);
          const rightTravel = lastRight == null ? 0 : Math.max(0, rightHand.x - lastRight);
          pulled += leftTravel + rightTravel;
          lastLeft = leftHand.x;
          lastRight = rightHand.x;
        } else {
          lastLeft = leftHand?.x ?? lastLeft;
          lastRight = rightHand?.x ?? lastRight;
        }

        return pulled >= TUG_PULL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: ROPE.x, y: ROPE.y, vx: 0, vy: 0 },
          scene: { kind: "tug-of-war", rope: { ...ROPE }, pulled, tugging },
        };
      },
    });
  },
});

/**
 * @param {import("../input/poses.js").PoseMap | undefined} pose
 * @param {{ x: number, y: number }} end
 */
function grab(pose, end) {
  if (!pose) return null;
  return listIdentifiedStrikers({ poses: [pose], source: pose.source, timestamp: 0 }).find((joint) => near(joint, end)) ?? null;
}

/**
 * @param {import("../input/poses.js").PoseSample} sample
 * @param {{ x: number, y: number }} end
 */
function grabSolo(sample, end) {
  return listIdentifiedStrikers(sample).find((joint) => near(joint, end)) ?? null;
}

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function near(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS + 0.05;
}
