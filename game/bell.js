/**
 * Ring the bell (#84): wrist into a high hanging zone that can sway.
 * Sibling to High five. Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const BELL_DURATION = PLAY_DURATION;
export const BELL_DWELL = 0.12;

/**
 * @typedef {object} BellScene
 * @property {"ring-bell"} kind
 * @property {{ x: number, y: number }} bell
 * @property {boolean} rung
 */

export const RING_BELL = defineMicrogame({
  id: "ring-bell",
  prompt: "Ring!",
  backgroundId: "high",
  duration: BELL_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BELL_DURATION;
    const restX = placeX(lane, 0.62);
    const restY = 0.16;
    let sway = 0;
    let held = 0;
    let rung = false;

    return createTimedPlay({
      lifetime,
      reset() {
        sway = 0;
        held = 0;
        rung = false;
      },
      step(dt, sample) {
        sway += dt;
        const bell = { x: restX + Math.sin(sway * 1.6) * 0.05, y: restY };
        const hit = listIdentifiedStrikers(sample).some((joint) => near(joint, bell));
        held = hit ? held + dt : 0;
        rung = hit;
        return held >= BELL_DWELL ? "win" : "playing";
      },
      view() {
        const x = restX + Math.sin(sway * 1.6) * 0.05;
        return {
          target: { id: 1, x, y: restY, vx: 0, vy: 0 },
          scene: { kind: "ring-bell", bell: { x, y: restY }, rung },
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
