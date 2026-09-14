/**
 * Pat the dog (#92): reach down and pat a low pet. Distinct from Feed the
 * pet (carry bowl) and Stomp (ankle squash). Timeout is the only fail.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { createTimedPlay } from "./timed.js";
import { FULL_LANE, placeX } from "./layout.js";

export const PAT_DURATION = PLAY_DURATION;
export const PAT_DWELL = 0.28;

/**
 * @typedef {object} PatScene
 * @property {"pat-dog"} kind
 * @property {{ x: number, y: number, stage: number }} dog
 * @property {boolean} patting
 */

export const PAT_DOG = defineMicrogame({
  id: "pat-dog",
  prompt: "Pat!",
  backgroundId: "hearth",
  duration: PAT_DURATION,
  create({ duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : PAT_DURATION;
    const dog = { x: placeX(lane, 0.42), y: 0.82 };
    let held = 0;
    let patting = false;

    return createTimedPlay({
      lifetime,
      reset() {
        held = 0;
        patting = false;
      },
      step(dt, sample) {
        patting = listIdentifiedStrikers(sample).some((joint) => Math.hypot(joint.x - dog.x, joint.y - dog.y) <= HIT_RADIUS);
        held = patting ? held + dt : 0;
        return held >= PAT_DWELL ? "win" : "playing";
      },
      view() {
        return {
          target: { id: 1, x: dog.x, y: dog.y, vx: 0, vy: 0 },
          scene: {
            kind: "pat-dog",
            dog: { ...dog, stage: held >= PAT_DWELL ? 1 : 0 },
            patting,
          },
        };
      },
    });
  },
});
