/**
 * Balance the tray (#34): sticky-carry sibling with a level constraint.
 * Prompt `Steady!`. Tray sticks to a hand; keep wrist Y delta small
 * while carrying to the goal. Tip beyond tolerance or timeout = fail.
 */

import { createStickyCarry, overlapsCarry } from "./carry.js";
import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { listIdentifiedStrikers } from "./hit.js";

export const TRAY_DURATION = PLAY_DURATION;
export const TRAY_PICKUP_DWELL = 0.4;
export const TRAY_ARRIVE_DWELL = 0.5;
/** |left_wrist.y − right_wrist.y| above this while held is a tip fail. */
export const TRAY_TIP_Y = 0.16;
/** Short grip beat so a first grab is not an instant tip. */
export const TRAY_TIP_GRACE = 0.35;

const TRAY_LEFT = { x: 0.24, y: 0.62 };
const TRAY_RIGHT = { x: 0.76, y: 0.56 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} TrayScene
 * @property {"balance-tray"} kind
 * @property {{ x: number, y: number, held: boolean, offered: boolean, heldBy: string | null, tipped: boolean }} tray
 * @property {{ x: number, y: number }} goal
 * @property {number} tilt
 * @property {boolean} arriving
 */

/**
 * @param {() => number} random
 */
export function layoutTray(random) {
  const flip = random() < 0.5;
  return flip
    ? { tray: { ...TRAY_RIGHT }, goal: { ...TRAY_LEFT } }
    : { tray: { ...TRAY_LEFT }, goal: { ...TRAY_RIGHT } };
}

export const BALANCE_TRAY = defineMicrogame({
  id: "balance-tray",
  prompt: "Steady!",
  backgroundId: "steady",
  duration: TRAY_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : TRAY_DURATION;
    let tray = { x: TRAY_LEFT.x, y: TRAY_LEFT.y };
    let goal = { x: TRAY_RIGHT.x, y: TRAY_RIGHT.y };
    const carry = createStickyCarry({ pickupDwell: TRAY_PICKUP_DWELL });
    let arriveTime = 0;
    let arriving = false;
    let holdTime = 0;
    let tilt = 0;
    let tipped = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /**
     * @returns {MicrogamePlay}
     */
    function api() {
      return {
        start() {
          const next = layoutTray(random);
          tray = { x: next.tray.x, y: next.tray.y };
          goal = { x: next.goal.x, y: next.goal.y };
          carry.reset(tray);
          arriveTime = 0;
          arriving = false;
          holdTime = 0;
          tilt = 0;
          tipped = false;
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
          const grip = carry.tick(strikers, step);
          const place = trayPlace(strikers, grip);
          tray.x = place.x;
          tray.y = place.y;
          tilt = wristTilt(strikers, grip.heldBy);

          if (grip.heldBy) {
            holdTime += step;
            if (holdTime >= TRAY_TIP_GRACE && tilt > TRAY_TIP_Y) {
              tipped = true;
              outcome = "fail";
              return "fail";
            }
            if (overlapsCarry(tray, goal)) {
              arriveTime += step;
              arriving = true;
              if (arriveTime >= TRAY_ARRIVE_DWELL) {
                outcome = "win";
                return "win";
              }
            } else {
              arriveTime = 0;
              arriving = false;
            }
          } else {
            holdTime = 0;
            arriveTime = 0;
            arriving = false;
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          const aim = outcome === "win" || carry.heldBy ? goal : tray;
          return {
            target: { id: 1, x: aim.x, y: aim.y, vx: 0, vy: 0 },
            timeLeft,
            lifetime,
            scene: {
              kind: "balance-tray",
              tray: {
                x: tray.x,
                y: tray.y,
                held: Boolean(carry.heldBy),
                offered: carry.offered,
                heldBy: carry.heldBy,
                tipped,
              },
              goal: { x: goal.x, y: goal.y },
              tilt,
              arriving,
            },
          };
        },
      };
    }

    return api();
  },
});

/**
 * Midpoint of the owner's wrists when both are live; else the sticky hand.
 *
 * @param {IdentifiedStriker[]} strikers
 * @param {{ heldBy: string | null, x: number, y: number }} grip
 */
function trayPlace(strikers, grip) {
  const pair = ownerWrists(strikers, grip.heldBy);
  if (pair) {
    return { x: (pair.left.x + pair.right.x) / 2, y: (pair.left.y + pair.right.y) / 2 };
  }
  return { x: grip.x, y: grip.y };
}

/**
 * @param {IdentifiedStriker[]} strikers
 * @param {string | null} heldBy
 */
function wristTilt(strikers, heldBy) {
  const pair = ownerWrists(strikers, heldBy);
  if (!pair) return 0;
  return Math.abs(pair.left.y - pair.right.y);
}

/**
 * @param {IdentifiedStriker[]} strikers
 * @param {string | null} heldBy
 * @returns {{ left: IdentifiedStriker, right: IdentifiedStriker } | null}
 */
function ownerWrists(strikers, heldBy) {
  if (!heldBy) return null;
  const owner = poseIdOf(heldBy);
  const left = strikers.find((hand) => hand.poseId === owner && hand.name === "left_wrist");
  const right = strikers.find((hand) => hand.poseId === owner && hand.name === "right_wrist");
  if (!left || !right) return null;
  return { left, right };
}

/**
 * @param {string} strikerId
 */
function poseIdOf(strikerId) {
  const i = String(strikerId).indexOf(":");
  return i === -1 ? strikerId : strikerId.slice(0, i);
}
