/**
 * Stir the pot (#89): wrist traces circles over a pot. New path family vs
 * pour-carry and roll-dough. Leaving the pot too long after starting fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const STIR_DURATION = PLAY_DURATION;
export const STIR_LOOPS = 2;
export const STIR_BREAK = 1.1;
export const STIR_RADIUS = HIT_RADIUS + 0.1;

/**
 * @typedef {object} StirScene
 * @property {"stir-pot"} kind
 * @property {{ x: number, y: number }} pot
 * @property {number} loops
 * @property {boolean} stirring
 */

export const STIR_POT = defineMicrogame({
  id: "stir-pot",
  prompt: "Stir!",
  backgroundId: "dough",
  duration: STIR_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : STIR_DURATION;
    const pot = { x: placeX(lane, 0.5), y: 0.58 };
    let angle = null;
    let travel = 0;
    let started = false;
    let away = 0;
    let stirring = false;

    return createTimedPlay({
      lifetime,
      reset() {
        angle = null;
        travel = 0;
        started = false;
        away = 0;
        stirring = false;
      },
      step(dt, sample) {
        const hand = pickHand(listIdentifiedStrikers(sample), pot);
        stirring = Boolean(hand);
        if (hand) {
          started = true;
          away = 0;
          const next = Math.atan2(hand.y - pot.y, hand.x - pot.x);
          if (angle != null) {
            let delta = next - angle;
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            travel += Math.abs(delta);
          }
          angle = next;
          if (travel >= STIR_LOOPS * Math.PI * 2) return "win";
        } else {
          angle = null;
          if (started) {
            away += dt;
            if (away >= STIR_BREAK) return "fail";
          }
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: pot.x, y: pot.y, vx: 0, vy: 0 },
          scene: {
            kind: "stir-pot",
            pot: { ...pot },
            loops: travel / (Math.PI * 2),
            stirring,
          },
        };
      },
    });
  },
});

/**
 * @param {{ x: number, y: number }[]} strikers
 * @param {{ x: number, y: number }} pot
 */
function pickHand(strikers, pot) {
  return strikers.find((joint) => Math.hypot(joint.x - pot.x, joint.y - pot.y) <= STIR_RADIUS) ?? null;
}
