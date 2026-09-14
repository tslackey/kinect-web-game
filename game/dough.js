/**
 * Roll the dough (#76): both hands on the pin, then stroke up and down
 * until the dough flattens. Distinct from Squash it (static zone) and
 * Stretch wide (distance only). Pointer is the camera-off stand-in.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const DOUGH_DURATION = PLAY_DURATION;
export const DOUGH_STROKES = 3;
/** Min vertical travel before a reverse counts as a stroke. */
export const DOUGH_STROKE = 0.12;
/** After a grip, leaving the pin this long fails. */
export const DOUGH_BREAK = 1;

const PIN_X = 0.5;
const HANDLE_SPAN = 0.14;
const BOARD = { y0: 0.34, y1: 0.68 };
const START_Y = 0.5;

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} DoughScene
 * @property {"roll-dough"} kind
 * @property {{ x: number, y: number, held: boolean }} pin
 * @property {{ x: number, y: number, held: boolean }} left
 * @property {{ x: number, y: number, held: boolean }} right
 * @property {{ x: number, y: number, flatten: number }} dough
 * @property {number} strokes
 * @property {boolean} rolling
 */

export function layoutDough() {
  return {
    pin: { x: PIN_X, y: START_Y },
    left: { x: PIN_X - HANDLE_SPAN, y: START_Y },
    right: { x: PIN_X + HANDLE_SPAN, y: START_Y },
  };
}

export const ROLL_DOUGH = defineMicrogame({
  id: "roll-dough",
  prompt: "Roll!",
  backgroundId: "dough",
  duration: DOUGH_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : DOUGH_DURATION;
    let pinY = START_Y;
    let strokes = 0;
    let strokeDir = 0;
    let strokeOrigin = START_Y;
    let hadGrip = false;
    let away = 0;
    let rolling = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    return {
      start() {
        pinY = START_Y;
        strokes = 0;
        strokeDir = 0;
        strokeOrigin = START_Y;
        hadGrip = false;
        away = 0;
        rolling = false;
        timeLeft = lifetime;
        outcome = "playing";
      },
      /**
       * @param {number} dt
       * @param {PoseSample} sample
       */
      tick(dt, sample) {
        if (outcome !== "playing") return outcome;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        const strikers = listIdentifiedStrikers(sample);
        const grip = gripOnPin(strikers, pinY);
        rolling = grip.held;

        if (grip.held) {
          hadGrip = true;
          away = 0;
          const nextY = clamp(grip.y, BOARD.y0, BOARD.y1);
          noteStroke(pinY, nextY);
          pinY = nextY;
          if (strokes >= DOUGH_STROKES) {
            outcome = "win";
            return "win";
          }
        } else if (hadGrip) {
          away += step;
          if (away >= DOUGH_BREAK) {
            outcome = "fail";
            return "fail";
          }
        }

        timeLeft = Math.max(0, timeLeft - step);
        if (timeLeft <= 0) {
          outcome = "fail";
          return "fail";
        }
        return "playing";
      },
      getView() {
        const flatten = Math.min(1, strokes / DOUGH_STROKES);
        const held = rolling || outcome === "win";
        return {
          target: { id: 1, x: PIN_X, y: pinY, vx: 0, vy: 0 },
          timeLeft,
          lifetime,
          scene: {
            kind: "roll-dough",
            pin: { x: PIN_X, y: pinY, held },
            left: { x: PIN_X - HANDLE_SPAN, y: pinY, held },
            right: { x: PIN_X + HANDLE_SPAN, y: pinY, held },
            dough: { x: PIN_X, y: 0.52, flatten },
            strokes,
            rolling: held,
          },
        };
      },
    };

    /**
     * @param {number} from
     * @param {number} to
     */
    function noteStroke(from, to) {
      const dy = to - from;
      if (Math.abs(dy) < 0.002) return;
      const dir = dy > 0 ? 1 : -1;
      if (strokeDir === 0) {
        strokeDir = dir;
        strokeOrigin = from;
        return;
      }
      if (dir === strokeDir) return;
      if (Math.abs(from - strokeOrigin) >= DOUGH_STROKE) {
        strokes += 1;
      }
      strokeDir = dir;
      strokeOrigin = from;
    }
  },
});

/**
 * Two wrists on the pin, or one pointer when the camera is off.
 *
 * @param {IdentifiedStriker[]} strikers
 * @param {number} pinY
 */
function gripOnPin(strikers, pinY) {
  const on = strikers.filter((joint) => onPin(joint, pinY));
  const wrists = on.filter((joint) => joint.name.endsWith("wrist"));
  const pointers = on.filter((joint) => joint.name === "pointer");
  const held = wrists.length >= 2 || pointers.length >= 1;
  if (!held) return { held: false, y: pinY };
  const hands = wrists.length >= 2 ? wrists : pointers;
  const y = hands.reduce((sum, joint) => sum + joint.y, 0) / hands.length;
  return { held: true, y };
}

/**
 * Horizontal pin: close in Y, between the handles in X.
 *
 * @param {{ x: number, y: number }} joint
 * @param {number} pinY
 */
function onPin(joint, pinY) {
  const left = PIN_X - HANDLE_SPAN;
  const right = PIN_X + HANDLE_SPAN;
  return joint.x >= left - HIT_RADIUS && joint.x <= right + HIT_RADIUS && Math.abs(joint.y - pinY) <= HIT_RADIUS;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
