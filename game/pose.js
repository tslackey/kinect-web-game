/**
 * Strike a pose (#28): hold wrists near two anchors.
 * Camera: both wrists at once. Pointer / keyboard: hold each anchor
 * in turn. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";

export const POSE_DURATION = PLAY_DURATION;
export const POSE_DWELL = 0.4;

const LEFT_ANCHOR = { x: 0.24, y: 0.38 };
const RIGHT_ANCHOR = { x: 0.76, y: 0.38 };

/**
 * @typedef {object} PoseScene
 * @property {"strike-pose"} kind
 * @property {{ x: number, y: number, held: boolean }} left
 * @property {{ x: number, y: number, held: boolean }} right
 */

export const STRIKE_POSE = defineMicrogame({
  id: "strike-pose",
  prompt: "Strike pose",
  backgroundId: "stage",
  duration: POSE_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : POSE_DURATION;
    let leftHeld = 0;
    let rightHeld = 0;
    let leftSticky = false;
    let rightSticky = false;

    return createTimedPlay({
      lifetime,
      reset() {
        leftHeld = 0;
        rightHeld = 0;
        leftSticky = false;
        rightSticky = false;
      },
      step(dt, sample) {
        const strikers = listIdentifiedStrikers(sample);
        const onLeft = strikers.some((joint) => near(joint, LEFT_ANCHOR));
        const onRight = strikers.some((joint) => near(joint, RIGHT_ANCHOR));
        const wrists = strikers.filter((joint) => joint.name.endsWith("wrist"));
        const bothLive = wrists.some((joint) => near(joint, LEFT_ANCHOR)) && wrists.some((joint) => near(joint, RIGHT_ANCHOR));

        if (bothLive) {
          leftHeld += dt;
          rightHeld += dt;
        } else {
          if (onLeft) {
            leftHeld += dt;
            if (leftHeld >= POSE_DWELL) leftSticky = true;
          } else if (!leftSticky) {
            leftHeld = 0;
          }
          if (onRight) {
            rightHeld += dt;
            if (rightHeld >= POSE_DWELL) rightSticky = true;
          } else if (!rightSticky) {
            rightHeld = 0;
          }
        }

        const posed =
          (leftHeld >= POSE_DWELL && rightHeld >= POSE_DWELL) || (leftSticky && rightSticky);
        return posed ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: LEFT_ANCHOR.x, y: LEFT_ANCHOR.y, vx: 0, vy: 0 },
          scene: {
            kind: "strike-pose",
            left: { ...LEFT_ANCHOR, held: leftHeld > 0 || leftSticky },
            right: { ...RIGHT_ANCHOR, held: rightHeld > 0 || rightSticky },
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
