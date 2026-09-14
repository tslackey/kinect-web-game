/**
 * Cheers / toast (#113): both players raise a cup and clink in the center.
 * Coop-center. Solo: raise a pointer (or both wrists) into the clink zone.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { posesFromSample } from "../input/poses.js";
import { createTimedPlay } from "./timed.js";
import { LAYOUT_COOP } from "./layout.js";

export const CHEERS_DURATION = PLAY_DURATION;
export const CHEERS_DWELL = 0.35;

const CLINK = { x: 0.5, y: 0.32 };

/**
 * @typedef {object} CheersScene
 * @property {"cheers-toast"} kind
 * @property {{ x: number, y: number }} clink
 * @property {boolean} p1
 * @property {boolean} p2
 * @property {boolean} toasting
 */

export const CHEERS_TOAST = defineMicrogame({
  id: "cheers-toast",
  prompt: "Cheers!",
  backgroundId: "pass",
  layout: LAYOUT_COOP,
  duration: CHEERS_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : CHEERS_DURATION;
    let held = 0;
    let p1 = false;
    let p2 = false;
    let toasting = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        p1 = false;
        p2 = false;
        toasting = false;
      },
      step(dt, sample) {
        const poses = posesFromSample(sample);
        if (poses.length >= 2) {
          p1 = raised(poses[0]);
          p2 = raised(poses[1]);
          toasting = p1 && p2;
        } else {
          const hands = listIdentifiedStrikers(sample).filter((joint) => near(joint, CLINK));
          const wrists = hands.filter((joint) => joint.name.endsWith("wrist"));
          const pointers = hands.filter((joint) => joint.name === "pointer");
          p1 = wrists.length >= 1 || pointers.length >= 1;
          p2 = wrists.length >= 2 || pointers.length >= 1;
          toasting = (wrists.length >= 2 || pointers.length >= 1) && p1;
        }
        held = toasting ? held + dt : 0;
        return held >= CHEERS_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: CLINK.x, y: CLINK.y, vx: 0, vy: 0 },
          scene: { kind: "cheers-toast", clink: { ...CLINK }, p1, p2, toasting },
        };
      },
    });
  },
});

/**
 * @param {import("../input/poses.js").PoseMap} pose
 */
function raised(pose) {
  const hands = listIdentifiedStrikers({ poses: [pose], source: pose.source, timestamp: 0 });
  return hands.some((joint) => near(joint, CLINK) || joint.y <= 0.38);
}

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function near(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS + 0.04;
}
