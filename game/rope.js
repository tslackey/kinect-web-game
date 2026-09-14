/**
 * Pull the rope (#93): both hands grab a handle, then one big downward pull.
 * Sibling to Roll dough (repeated strokes) but a single directed travel.
 * Release early after a grab fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const ROPE_DURATION = PLAY_DURATION;
export const ROPE_PULL = 0.18;
export const ROPE_BREAK = 0.9;

/**
 * @typedef {object} RopeScene
 * @property {"pull-rope"} kind
 * @property {{ x: number, y: number, held: boolean }} handle
 * @property {number} pulled
 * @property {boolean} grabbing
 */

export const PULL_ROPE = defineMicrogame({
  id: "pull-rope",
  prompt: "Pull!",
  backgroundId: "span",
  duration: ROPE_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : ROPE_DURATION;
    const handleX = placeX(lane, 0.5);
    const startY = 0.28;
    let handleY = startY;
    let grabY = null;
    let pulled = 0;
    let grabbing = false;
    let hadGrab = false;
    let away = 0;

    return createTimedPlay({
      lifetime,
      reset() {
        handleY = startY;
        grabY = null;
        pulled = 0;
        grabbing = false;
        hadGrab = false;
        away = 0;
      },
      step(dt, sample) {
        const grip = gripHandle(listIdentifiedStrikers(sample), handleX, handleY, grabbing);
        grabbing = grip.held;
        if (grip.held) {
          hadGrab = true;
          away = 0;
          if (grabY == null) grabY = grip.y;
          handleY = clamp(grip.y, startY, 0.78);
          pulled = Math.max(0, handleY - grabY);
          if (pulled >= ROPE_PULL) return "win";
        } else if (hadGrab) {
          away += dt;
          if (away >= ROPE_BREAK) return "fail";
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: handleX, y: handleY, vx: 0, vy: 0 },
          scene: {
            kind: "pull-rope",
            handle: { x: handleX, y: handleY, held: grabbing },
            pulled,
            grabbing,
          },
        };
      },
    });
  },
});

/**
 * Two wrists on the handle, or one pointer when the camera is off.
 * After a grab, Y follow is looser so a fast pull does not drop the rope.
 *
 * @param {import("./hit.js").IdentifiedStriker[]} strikers
 * @param {number} x
 * @param {number} y
 * @param {boolean} already
 */
function gripHandle(strikers, x, y, already) {
  const radius = already ? HIT_RADIUS + 0.14 : HIT_RADIUS + 0.04;
  const on = strikers.filter((joint) => Math.abs(joint.x - x) <= radius && Math.abs(joint.y - y) <= radius);
  const wrists = on.filter((joint) => joint.name.endsWith("wrist"));
  const pointers = on.filter((joint) => joint.name === "pointer");
  const held = wrists.length >= 2 || pointers.length >= 1;
  if (!held) return { held: false, y };
  const hands = wrists.length >= 2 ? wrists : pointers;
  const nextY = hands.reduce((sum, joint) => sum + joint.y, 0) / hands.length;
  return { held: true, y: nextY };
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
