/**
 * Knock on the door (#112): repeated wrist taps on a mid-height panel.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const KNOCK_DURATION = PLAY_DURATION;
export const KNOCK_COUNT = 3;

/**
 * @typedef {object} KnockScene
 * @property {"knock-door"} kind
 * @property {{ x: number, y: number }} door
 * @property {number} knocks
 * @property {boolean} knocking
 */

export const KNOCK_DOOR = defineMicrogame({
  id: "knock-door",
  prompt: "Knock!",
  backgroundId: "press",
  duration: KNOCK_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : KNOCK_DURATION;
    const door = { x: placeX(lane, 0.72), y: 0.42 };
    let knocks = 0;
    let inside = false;
    let knocking = false;

    return createTimedPlay({
      lifetime,
      reset() {
        knocks = 0;
        inside = false;
        knocking = false;
      },
      step(_dt, sample) {
        const hit = listIdentifiedStrikers(sample).some((joint) => Math.hypot(joint.x - door.x, joint.y - door.y) <= HIT_RADIUS);
        knocking = hit;
        if (hit && !inside) {
          knocks += 1;
          inside = true;
          if (knocks >= KNOCK_COUNT) return "win";
        }
        if (!hit) inside = false;
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: door.x, y: door.y, vx: 0, vy: 0 },
          scene: { kind: "knock-door", door: { ...door }, knocks, knocking },
        };
      },
    });
  },
});
