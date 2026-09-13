/**
 * Hand-hold start / play-again. Active on start and game-over only.
 * Either body can fill the shared mark. Click Play stays as fallback.
 */

import { HIT_RADIUS, hitsTarget, listSampleStrikers } from "./hit.js";

/** Hold seconds. Tune in 0.6–1.0 so the fill is readable, not mushy. */
export const START_DWELL = 0.8;

/**
 * On-canvas mark. Bottom-center, clear of the left HUD, the camera
 * chip, and the default orb / carry props so existing tests and live
 * hits do not start a session by accident.
 */
export const START_HOLD = { x: 0.5, y: 0.72 };

/** Same strike radius as wrist / pointer games. */
export const START_HOLD_RADIUS = HIT_RADIUS;

/**
 * @typedef {object} StartHold
 * @property {boolean} active
 * @property {number} progress 0–1 fill. Resets to 0 when the hand leaves.
 * @property {boolean} hovering
 * @property {boolean} fired true on the frame the dwell completes.
 * @property {{ x: number, y: number }} target
 * @property {string} label
 */

/**
 * @param {"start" | "prompt" | "playing" | "result" | "over" | string} phase
 * @param {Partial<StartHold>} [extra]
 * @returns {StartHold}
 */
export function startHoldFor(phase, extra = {}) {
  const active = phase === "start" || phase === "over";
  return {
    active,
    progress: extra.progress ?? 0,
    hovering: extra.hovering ?? false,
    fired: extra.fired ?? false,
    target: extra.target ?? { ...START_HOLD },
    label: phase === "over" ? "Play again" : "Play",
  };
}

/**
 * @param {{
 *   dwell?: number,
 *   target?: { x: number, y: number },
 * }} [options]
 */
export function createStartDwell({ dwell = START_DWELL, target = START_HOLD } = {}) {
  const limit = Number.isFinite(dwell) && dwell > 0 ? dwell : START_DWELL;
  const mark = {
    x: Number.isFinite(target?.x) ? target.x : START_HOLD.x,
    y: Number.isFinite(target?.y) ? target.y : START_HOLD.y,
  };

  let held = 0;
  let armed = true;

  /**
   * @param {number} dt
   * @param {import("../input/index.js").PoseSample | null | undefined} sample
   * @param {string} phase
   * @returns {StartHold}
   */
  function update(dt, sample, phase) {
    if (phase !== "start" && phase !== "over") {
      held = 0;
      armed = true;
      return startHoldFor(phase, { target: { ...mark } });
    }

    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const strikers = listSampleStrikers(sample);
    const hovering = hitsTarget(strikers, mark);
    if (hovering) {
      held += step;
    } else {
      held = 0;
      armed = true;
    }

    const progress = Math.min(1, held / limit);
    const fired = armed && progress >= 1;
    if (fired) armed = false;

    return startHoldFor(phase, {
      progress,
      hovering,
      fired,
      target: { ...mark },
    });
  }

  function reset() {
    held = 0;
    armed = true;
  }

  return { update, reset };
}
