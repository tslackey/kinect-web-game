/**
 * Brush your teeth (#105): wrist near the mouth, scrub for N strokes.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { headPoint, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const BRUSH_DURATION = PLAY_DURATION;
export const BRUSH_STROKES = 4;
export const BRUSH_TRAVEL = 0.08;
export const BRUSH_BREAK = 1.2;

/**
 * @typedef {object} BrushScene
 * @property {"brush-teeth"} kind
 * @property {number} strokes
 * @property {boolean} brushing
 */

export const BRUSH_TEETH = defineMicrogame({
  id: "brush-teeth",
  prompt: "Brush!",
  backgroundId: "hello",
  duration: BRUSH_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BRUSH_DURATION;
    let lastX = null;
    let dir = 0;
    let origin = 0;
    let strokes = 0;
    let started = false;
    let away = 0;
    let brushing = false;

    return createTimedPlay({
      lifetime,
      reset() {
        lastX = null;
        dir = 0;
        origin = 0;
        strokes = 0;
        started = false;
        away = 0;
        brushing = false;
      },
      step(dt, sample) {
        const hand = nearMouth(sample);
        brushing = Boolean(hand);
        if (hand) {
          started = true;
          away = 0;
          noteStroke(hand.x);
          lastX = hand.x;
          if (strokes >= BRUSH_STROKES) return "win";
        } else {
          lastX = null;
          if (started) {
            away += dt;
            if (away >= BRUSH_BREAK) return "fail";
          }
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: 0.32, vx: 0, vy: 0 },
          scene: { kind: "brush-teeth", strokes, brushing },
        };
      },
    });

    /**
     * @param {number} x
     */
    function noteStroke(x) {
      if (lastX == null) {
        origin = x;
        return;
      }
      const dx = x - lastX;
      if (Math.abs(dx) < 0.002) return;
      const next = dx > 0 ? 1 : -1;
      if (dir === 0) {
        dir = next;
        origin = lastX;
        return;
      }
      if (next === dir) return;
      if (Math.abs(lastX - origin) >= BRUSH_TRAVEL) strokes += 1;
      dir = next;
      origin = lastX;
    }
  },
});

/**
 * @param {import("../input/poses.js").PoseSample} sample
 */
function nearMouth(sample) {
  let found = null;
  somePose(sample, (pose) => {
    const mouth = headPoint(pose);
    mouth.y += 0.06;
    const hit = listIdentifiedStrikers({ poses: [pose], source: pose.source, timestamp: 0 }).find(
      (joint) => Math.hypot(joint.x - mouth.x, joint.y - mouth.y) <= HIT_RADIUS + 0.04,
    );
    if (hit) found = hit;
    return Boolean(hit);
  });
  return found;
}
