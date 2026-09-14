/**
 * Dig for treasure (#115): scoop into a low pile N times, then treasure.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const DIG_DURATION = PLAY_DURATION;
export const DIG_STROKES = 3;
export const DIG_TRAVEL = 0.1;

/**
 * @typedef {object} DigScene
 * @property {"dig-treasure"} kind
 * @property {{ x: number, y: number }} pile
 * @property {number} digs
 * @property {boolean} found
 */

export const DIG_TREASURE = defineMicrogame({
  id: "dig-treasure",
  prompt: "Dig!",
  backgroundId: "dirt",
  duration: DIG_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : DIG_DURATION;
    const pile = { x: placeX(lane, 0.5), y: 0.8 };
    let lastY = null;
    let dir = 0;
    let origin = 0;
    let digs = 0;
    let found = false;

    return createTimedPlay({
      lifetime,
      reset() {
        lastY = null;
        dir = 0;
        origin = 0;
        digs = 0;
        found = false;
      },
      step(_dt, sample) {
        const hand = listIdentifiedStrikers(sample).find((joint) => Math.hypot(joint.x - pile.x, joint.y - pile.y) <= HIT_RADIUS + 0.08);
        if (!hand) {
          lastY = null;
          return "playing";
        }
        if (lastY == null) {
          lastY = hand.y;
          origin = hand.y;
          return "playing";
        }
        const dy = hand.y - lastY;
        if (Math.abs(dy) >= 0.002) {
          const next = dy > 0 ? 1 : -1;
          if (dir === 0) {
            dir = next;
            origin = lastY;
          } else if (next !== dir) {
            if (Math.abs(lastY - origin) >= DIG_TRAVEL) digs += 1;
            dir = next;
            origin = lastY;
          }
        }
        lastY = hand.y;
        if (digs >= DIG_STROKES) {
          found = true;
          return "win";
        }
        return "playing";
      },
      view() {
        return {
          target: { id: 1, x: pile.x, y: pile.y, vx: 0, vy: 0 },
          scene: { kind: "dig-treasure", pile: { ...pile }, digs, found },
        };
      },
    });
  },
});
