/**
 * Clap now (#30): wrist–wrist distance on cue.
 * Before the cue, a clap does not fail (not a wrong-gesture miss).
 * Pointer / keyboard: hit the clap mark once the cue is live.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { pairDistance, somePose } from "./body.js";
import { createTimedPlay } from "./timed.js";

export const CLAP_DURATION = PLAY_DURATION;
export const CLAP_CUE_AT = 1.15;
export const CLAP_SPAN = 0.16;
const CLAP_MARK = { x: 0.5, y: 0.42 };

/**
 * @typedef {object} ClapScene
 * @property {"clap-now"} kind
 * @property {boolean} cue
 * @property {boolean} clapped
 */

export const CLAP_NOW = defineMicrogame({
  id: "clap-now",
  prompt: "Clap now",
  backgroundId: "cue",
  duration: CLAP_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : CLAP_DURATION;
    let elapsed = 0;
    let clapped = false;

    return createTimedPlay({
      lifetime,
      reset() {
        elapsed = 0;
        clapped = false;
      },
      step(dt, sample) {
        elapsed += dt;
        const cue = elapsed >= CLAP_CUE_AT;
        if (!cue) return "playing";

        const hands = somePose(sample, (pose) => {
          const span = pairDistance(pose, "left_wrist", "right_wrist");
          return span != null && span <= CLAP_SPAN;
        });
        const mark = listIdentifiedStrikers(sample).some((joint) => near(joint, CLAP_MARK));
        clapped = hands || mark;
        return clapped ? "win" : "playing";
      },
      view() {
        const cue = elapsed >= CLAP_CUE_AT;
        return {
          target: { id: 1, x: CLAP_MARK.x, y: CLAP_MARK.y, vx: 0, vy: 0 },
          scene: { kind: "clap-now", cue, clapped },
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
