/**
 * Block it (#90): a projectile flies in; raise a forearm shield before impact.
 * Distinct from High five (hit a high mark) and Lean away (dodge).
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { somePose, torsoX } from "./body.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const BLOCK_DURATION = PLAY_DURATION;
export const BLOCK_SPEED = 0.28;

/**
 * @typedef {object} BlockScene
 * @property {"block-it"} kind
 * @property {{ x: number, y: number }} shot
 * @property {{ x: number, y: number }} shield
 * @property {boolean} blocked
 */

export const BLOCK_IT = defineMicrogame({
  id: "block-it",
  prompt: "Block!",
  backgroundId: "tilt",
  duration: BLOCK_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BLOCK_DURATION;
    const fromLeft = random() < 0.5;
    const startX = placeX(lane, fromLeft ? 0.08 : 0.92);
    const endX = placeX(lane, 0.5);
    const y = 0.4;
    const shield = { x: placeX(lane, 0.5), y };
    let shotX = startX;
    let blocked = false;

    return createTimedPlay({
      lifetime,
      reset() {
        shotX = startX;
        blocked = false;
      },
      step(dt, sample) {
        const dir = endX >= startX ? 1 : -1;
        shotX += dir * BLOCK_SPEED * dt;
        const shot = { x: shotX, y };
        const hands = listIdentifiedStrikers(sample);
        const raised = shielding(hands, shield) || somePose(sample, (pose) => {
          const x = torsoX(pose);
          if (x == null) return false;
          const left = pose.joints?.left_wrist;
          const right = pose.joints?.right_wrist;
          const pointer = pose.joints?.pointer;
          if (pointer && (pointer.confidence ?? 1) >= 0.4 && Math.hypot(pointer.x - shield.x, pointer.y - shield.y) <= HIT_RADIUS + 0.04) {
            return true;
          }
          if (!left || !right) return false;
          return left.y < 0.48 && right.y < 0.48 && Math.abs(((left.x + right.x) / 2) - x) < 0.22;
        });
        const reached = dir > 0 ? shotX >= shield.x : shotX <= shield.x;
        if (reached) {
          blocked = raised;
          return raised ? "win" : "fail";
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: shotX, y, vx: 0, vy: 0 },
          scene: {
            kind: "block-it",
            shot: { x: shotX, y },
            shield: { ...shield },
            blocked,
          },
        };
      },
    });
  },
});

/**
 * @param {{ x: number, y: number }[]} hands
 * @param {{ x: number, y: number }} shield
 */
function shielding(hands, shield) {
  const wrists = hands.filter((joint) => joint.name?.endsWith?.("wrist"));
  const pointers = hands.filter((joint) => joint.name === "pointer");
  const on = (joint) => Math.hypot(joint.x - shield.x, joint.y - shield.y) <= HIT_RADIUS + 0.06 && joint.y <= 0.52;
  return wrists.filter(on).length >= 2 || pointers.some(on);
}
