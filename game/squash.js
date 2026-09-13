/**
 * Squash it (#37): both wrists in one zone.
 * Pointer / keyboard: dwell in the zone (one stand-in). Timeout only fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";

export const SQUASH_DURATION = PLAY_DURATION;
export const SQUASH_DWELL = 0.35;
const ZONE = { x: 0.5, y: 0.4 };

/**
 * @typedef {object} SquashScene
 * @property {"squash-it"} kind
 * @property {{ x: number, y: number }} zone
 * @property {number} hands
 * @property {boolean} squashing
 */

export const SQUASH_IT = defineMicrogame({
  id: "squash-it",
  prompt: "Squash it",
  backgroundId: "press",
  duration: SQUASH_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : SQUASH_DURATION;
    let held = 0;
    let hands = 0;
    let squashing = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        hands = 0;
        squashing = false;
      },
      step(dt, sample) {
        const inside = listIdentifiedStrikers(sample).filter((joint) => near(joint, ZONE));
        const wrists = inside.filter((joint) => joint.name.endsWith("wrist"));
        const pointers = inside.filter((joint) => joint.name === "pointer");
        hands = Math.max(wrists.length, pointers.length ? 1 : 0);
        const enough = wrists.length >= 2 || pointers.length >= 1;
        squashing = enough;
        held = enough ? held + dt : 0;
        return held >= SQUASH_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: ZONE.x, y: ZONE.y, vx: 0, vy: 0 },
          scene: { kind: "squash-it", zone: { ...ZONE }, hands, squashing },
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
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS + 0.02;
}
