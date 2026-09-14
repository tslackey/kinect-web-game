/**
 * Stamp the passport (#108): raise a wrist, then slam down onto a pad.
 * Distinct from Pat the dog (gentle) and High five (high).
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const STAMP_DURATION = PLAY_DURATION;
export const STAMP_LIFT = 0.36;
export const STAMP_DRIVE = 0.1;

/**
 * @typedef {object} StampScene
 * @property {"stamp-passport"} kind
 * @property {{ x: number, y: number }} pad
 * @property {boolean} cocked
 * @property {boolean} stamped
 */

export const STAMP_PASSPORT = defineMicrogame({
  id: "stamp-passport",
  prompt: "Stamp!",
  backgroundId: "press",
  duration: STAMP_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : STAMP_DURATION;
    const pad = { x: placeX(lane, 0.5), y: 0.7 };
    /** @type {Map<string, { x: number, y: number }>} */
    const last = new Map();
    let cocked = false;
    let stamped = false;

    return createTimedPlay({
      lifetime,
      reset() {
        last.clear();
        cocked = false;
        stamped = false;
      },
      step(_dt, sample) {
        const strikers = listIdentifiedStrikers(sample);
        for (const joint of strikers) {
          if (joint.y <= STAMP_LIFT) cocked = true;
          const prev = last.get(joint.id);
          last.set(joint.id, { x: joint.x, y: joint.y });
          const drive = prev ? joint.y - prev.y : 0;
          const onPad = Math.hypot(joint.x - pad.x, joint.y - pad.y) <= HIT_RADIUS + 0.02;
          if (cocked && onPad && (drive >= STAMP_DRIVE || joint.y >= pad.y - 0.04)) {
            stamped = true;
            return "win";
          }
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: pad.x, y: pad.y, vx: 0, vy: 0 },
          scene: { kind: "stamp-passport", pad: { ...pad }, cocked, stamped },
        };
      },
    });
  },
});
