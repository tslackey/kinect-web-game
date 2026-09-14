/**
 * Limbo under (#86): a bar descends; duck under it without contact.
 * Head/shoulders hitting the bar fails. Timeout fails. Distinct from
 * Duck the beam (static height).
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { highestY, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const LIMBO_DURATION = PLAY_DURATION;
export const LIMBO_START_Y = 0.18;
export const LIMBO_END_Y = 0.56;
export const LIMBO_DROP = 0.09;
export const LIMBO_CLEARANCE = 0.02;

const HEIGHT_NAMES = ["nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip", "pointer"];

/**
 * @typedef {object} LimboScene
 * @property {"limbo-under"} kind
 * @property {{ y: number }} bar
 * @property {boolean} ducked
 */

export const LIMBO_UNDER = defineMicrogame({
  id: "limbo-under",
  prompt: "Limbo!",
  backgroundId: "beam",
  duration: LIMBO_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : LIMBO_DURATION;
    let barY = LIMBO_START_Y;
    let ducked = false;
    let cleared = false;

    return createTimedPlay({
      lifetime,
      reset() {
        barY = LIMBO_START_Y;
        ducked = false;
        cleared = false;
      },
      step(dt, sample) {
        barY = Math.min(LIMBO_END_Y, barY + LIMBO_DROP * dt);
        let hit = false;
        ducked = somePose(sample, (pose) => {
          const top = highestY(pose, HEIGHT_NAMES);
          if (top == null) return false;
          if (barY > top + LIMBO_CLEARANCE) {
            hit = true;
            return false;
          }
          return top >= barY + LIMBO_CLEARANCE;
        });
        if (hit) return "fail";
        if (ducked && barY >= 0.4) {
          cleared = true;
          return "win";
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: 0.5, y: barY, vx: 0, vy: 0 },
          scene: { kind: "limbo-under", bar: { y: barY }, ducked: ducked || cleared },
        };
      },
    });
  },
});
