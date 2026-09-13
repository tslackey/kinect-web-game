/**
 * Curtain interstitial between microgames.
 * Session calls toNext({ title, backgroundId }) — games do not invent wipes.
 *
 * Sequence: curtain down → hidden beat (swap stage here) → curtain up
 * revealing a front-center title placard → optional hold → play.
 * Reduced-motion uses a shorter / near-instant path.
 */

/** @typedef {"idle" | "down" | "covered" | "up" | "hold" | "done"} CurtainPhase */

/**
 * @typedef {object} CurtainTimings
 * @property {number} down
 * @property {number} covered
 * @property {number} up
 * @property {number} hold
 */

/**
 * @typedef {object} CurtainView
 * @property {CurtainPhase} phase
 * @property {string} title
 * @property {string} subtitle
 * @property {string} backgroundId
 * @property {number} cover 0 open … 1 closed
 * @property {number} progress 0…1 through the whole interstitial
 * @property {number} remaining Seconds left before play
 * @property {boolean} placard Title card is showing
 * @property {boolean} readyToSwap True on the covered beat until consumeSwap()
 * @property {boolean} swapped
 * @property {boolean} done
 * @property {number} placardScale Modest reveal pulse. 1 when reduced-motion.
 */

/** @type {Readonly<CurtainTimings>} */
export const DEFAULT_CURTAIN_TIMINGS = Object.freeze({
  down: 0.78,
  covered: 0.28,
  up: 0.72,
  hold: 1.65,
});

/** Instant cover; keep a readable placard, still shorter than default. */
export const REDUCED_CURTAIN_TIMINGS = Object.freeze({
  down: 0,
  covered: 0,
  up: 0,
  hold: 1.05,
});

/**
 * @param {number} t
 */
export function easeInOutCubic(t) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * @param {{ reducedMotion?: boolean, timings?: CurtainTimings }} [options]
 * @returns {CurtainTimings}
 */
export function timingsFor(options = {}) {
  if (options.timings) return options.timings;
  return options.reducedMotion ? REDUCED_CURTAIN_TIMINGS : DEFAULT_CURTAIN_TIMINGS;
}

/**
 * @param {{ reducedMotion?: boolean, timings?: CurtainTimings }} [options]
 */
export function interstitialDuration(options = {}) {
  const timings = timingsFor(options);
  return timings.down + timings.covered + timings.up + timings.hold;
}

/**
 * @param {{ reducedMotion?: boolean, timings?: CurtainTimings }} [options]
 */
export function createTransition(options = {}) {
  const timings = timingsFor(options);
  const reducedMotion = Boolean(options.reducedMotion);
  /** @type {CurtainPhase} */
  let phase = "idle";
  let elapsed = 0;
  let title = "";
  let subtitle = "";
  let backgroundId = "";
  let swapped = false;

  /**
   * Session entry. Starts the curtain; swap the next stage on readyToSwap.
   *
   * @param {{ title?: string, backgroundId?: string, subtitle?: string }} [next]
   * @returns {CurtainView}
   */
  function toNext(next = {}) {
    title = typeof next.title === "string" ? next.title : "";
    subtitle = typeof next.subtitle === "string" ? next.subtitle : "";
    backgroundId = typeof next.backgroundId === "string" ? next.backgroundId : "";
    elapsed = 0;
    swapped = false;
    phase = timings.down > 0 ? "down" : timings.covered > 0 ? "covered" : "up";
    return getView();
  }

  /**
   * @param {number} dt
   * @returns {CurtainView}
   */
  function tick(dt) {
    if (phase === "idle" || phase === "done") return getView();
    elapsed += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    advance();
    return getView();
  }

  function consumeSwap() {
    swapped = true;
    return getView();
  }

  function reset() {
    phase = "idle";
    elapsed = 0;
    title = "";
    subtitle = "";
    backgroundId = "";
    swapped = false;
    return getView();
  }

  function advance() {
    while (phase !== "idle" && phase !== "done") {
      const limit = durationOf(phase, timings);
      if (elapsed < limit) break;
      elapsed -= limit;
      phase = nextPhase(phase);
    }
  }

  function getView() {
    const cover = coverAmount(phase, elapsed, timings);
    const remaining = remainingOf(phase, elapsed, timings);
    const total = interstitialDuration({ timings });
    return {
      phase,
      title,
      subtitle,
      backgroundId,
      cover,
      progress: total > 0 ? clamp01(1 - remaining / total) : 1,
      remaining,
      placard: phase === "up" || phase === "hold" || phase === "done",
      readyToSwap: (phase === "covered" || phase === "up" || phase === "hold" || phase === "done") && !swapped,
      swapped,
      done: phase === "done",
      placardScale: placardScaleOf(phase, elapsed, timings, reducedMotion),
    };
  }

  return { toNext, tick, consumeSwap, reset, getView, timings };
}

/**
 * @param {CurtainPhase} phase
 * @param {CurtainTimings} timings
 */
function durationOf(phase, timings) {
  if (phase === "down") return timings.down;
  if (phase === "covered") return timings.covered;
  if (phase === "up") return timings.up;
  if (phase === "hold") return timings.hold;
  return 0;
}

/**
 * @param {CurtainPhase} phase
 */
function nextPhase(phase) {
  if (phase === "down") return "covered";
  if (phase === "covered") return "up";
  if (phase === "up") return "hold";
  return "done";
}

/**
 * @param {CurtainPhase} phase
 * @param {number} elapsed
 * @param {CurtainTimings} timings
 */
function coverAmount(phase, elapsed, timings) {
  if (phase === "down") {
    const span = Math.max(timings.down, 1e-6);
    return easeInOutCubic(elapsed / span);
  }
  if (phase === "covered") return 1;
  if (phase === "up") {
    const span = Math.max(timings.up, 1e-6);
    return 1 - easeInOutCubic(elapsed / span);
  }
  return 0;
}

/**
 * @param {CurtainPhase} phase
 * @param {number} elapsed
 * @param {CurtainTimings} timings
 */
function remainingOf(phase, elapsed, timings) {
  if (phase === "idle") return 0;
  if (phase === "done") return 0;
  let left = Math.max(0, durationOf(phase, timings) - elapsed);
  let walk = phase;
  while (walk !== "done") {
    walk = nextPhase(walk);
    if (walk !== "done") left += durationOf(walk, timings);
  }
  return left;
}

/**
 * Modest scale pulse as the title lands. Reduced-motion stays at 1.
 *
 * @param {CurtainPhase} phase
 * @param {number} elapsed
 * @param {CurtainTimings} timings
 * @param {boolean} reducedMotion
 */
export function placardScaleOf(phase, elapsed, timings, reducedMotion) {
  if (reducedMotion) return 1;
  if (phase === "up") {
    const t = clamp01(elapsed / Math.max(timings.up, 1e-6));
    return 0.96 + 0.06 * easeInOutCubic(t);
  }
  if (phase === "hold") {
    const span = Math.min(0.4, Math.max(timings.hold, 1e-6));
    const t = clamp01(elapsed / span);
    return 1 + 0.055 * (1 - t) * (1 - t);
  }
  return 1;
}

/**
 * @param {number} value
 */
function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
