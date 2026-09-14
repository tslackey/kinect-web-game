/**
 * Comb your hair (#111): wrist above the head, stroke N times.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { headPoint, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const COMB_DURATION = PLAY_DURATION;
export const COMB_STROKES = 3;
export const COMB_TRAVEL = 0.1;

/**
 * @typedef {object} CombScene
 * @property {"comb-hair"} kind
 * @property {number} strokes
 * @property {boolean} combing
 */

export const COMB_HAIR = defineMicrogame({
  id: "comb-hair",
  prompt: "Comb!",
  backgroundId: "hello",
  duration: COMB_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : COMB_DURATION;
    let lastX = null;
    let dir = 0;
    let origin = 0;
    let strokes = 0;
    let combing = false;

    return createTimedPlay({
      lifetime,
      reset() {
        lastX = null;
        dir = 0;
        origin = 0;
        strokes = 0;
        combing = false;
      },
      step(_dt, sample) {
        const hand = nearCrown(sample);
        combing = Boolean(hand);
        if (!hand) {
          lastX = null;
          return "playing";
        }
        if (lastX == null) {
          lastX = hand.x;
          origin = hand.x;
          return "playing";
        }
        const dx = hand.x - lastX;
        if (Math.abs(dx) >= 0.002) {
          const next = dx > 0 ? 1 : -1;
          if (dir === 0) {
            dir = next;
            origin = lastX;
          } else if (next !== dir) {
            if (Math.abs(lastX - origin) >= COMB_TRAVEL) strokes += 1;
            dir = next;
            origin = lastX;
          }
        }
        lastX = hand.x;
        return strokes >= COMB_STROKES ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.12, vx: 0, vy: 0 },
          scene: { kind: "comb-hair", strokes, combing },
        };
      },
    });
  },
});

/**
 * @param {import("../input/poses.js").PoseSample} sample
 */
function nearCrown(sample) {
  let found = null;
  somePose(sample, (pose) => {
    const head = headPoint(pose);
    const crown = { x: head.x, y: head.y - 0.08 };
    const hit = listIdentifiedStrikers({ poses: [pose], source: pose.source, timestamp: 0 }).find(
      (joint) => joint.y <= head.y + 0.02 && Math.hypot(joint.x - crown.x, joint.y - crown.y) <= HIT_RADIUS + 0.08,
    );
    if (hit) found = hit;
    return Boolean(hit);
  });
  return found;
}
