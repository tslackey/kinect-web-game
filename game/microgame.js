/**
 * Microgame contract. A later pack plugs into the session with these fields:
 * prompt, duration, win, fail, next.
 *
 * Loop: short on-screen prompt → one game on a short timer → win or fail → next.
 * Win / fail are timeout-or-success, never “wrong gesture.”
 * Play ticks see 1 or 2 pose maps from one webcam sample (not one cam per player).
 */

export const GAME_COUNT = 3;
export const PROMPT_DURATION = 1.05;
export const RESULT_DURATION = 0.9;

/** @type {readonly MicrogameOutcome[]} */
export const MICROGAME_OUTCOMES = Object.freeze(["playing", "win", "fail"]);

/**
 * @typedef {"playing" | "win" | "fail"} MicrogameOutcome
 * @typedef {import("../input/poses.js").PoseSample} PoseSample
 */

/**
 * Render-facing slice a play instance exposes each tick.
 *
 * @typedef {object} MicrogameView
 * @property {{ id: number, x: number, y: number, vx: number, vy: number } | null} [target]
 * @property {number | null} [timeLeft]
 * @property {number} [lifetime]
 * @property {number} [driftScale]
 * @property {import("./plant.js").WaterScene | null} [scene]
 */

/**
 * One live attempt. `tick` returns playing until timeout (fail) or success (win).
 *
 * @typedef {object} MicrogamePlay
 * @property {() => void} start
 * @property {(dt: number, sample: PoseSample) => MicrogameOutcome} tick
 * @property {() => MicrogameView} getView
 */

/**
 * @typedef {object} MicrogameCreateContext
 * @property {() => number} random
 * @property {number} index 1-based place in the session sequence
 * @property {number} duration Seconds of play after the prompt
 */

/**
 * Pack entry. `create` builds a fresh play instance; the session owns next.
 *
 * @typedef {object} MicrogameDef
 * @property {string} id
 * @property {string} prompt Short on-screen cue
 * @property {number} duration Seconds of play after the prompt
 * @property {(ctx: MicrogameCreateContext) => MicrogamePlay} create
 */

/**
 * @param {unknown} def
 * @returns {def is MicrogameDef}
 */
export function isMicrogameDef(def) {
  if (!def || typeof def !== "object") return false;
  const item = /** @type {Partial<MicrogameDef>} */ (def);
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.prompt === "string" &&
    item.prompt.length > 0 &&
    Number.isFinite(item.duration) &&
    Number(item.duration) > 0 &&
    typeof item.create === "function"
  );
}

/**
 * @param {MicrogameDef} def
 * @returns {MicrogameDef}
 */
export function defineMicrogame(def) {
  if (!isMicrogameDef(def)) {
    throw new Error("A microgame needs id, prompt, a positive duration, and create().");
  }
  return def;
}

/**
 * @param {unknown} value
 * @returns {value is MicrogameOutcome}
 */
export function isPlayOutcome(value) {
  return value === "playing" || value === "win" || value === "fail";
}

/**
 * Build the session sequence. A pack is a list of defs; it repeats to fill
 * `games` if needed. Invalid defs are skipped. The session, not the pack,
 * advances to next after win or fail.
 *
 * @param {unknown} pack
 * @param {number} games
 * @param {MicrogameDef} fallback
 * @returns {MicrogameDef[]}
 */
export function sequenceFromPack(pack, games, fallback) {
  const count = Math.max(1, Math.floor(games) || GAME_COUNT);
  const valid = Array.isArray(pack) ? pack.filter(isMicrogameDef) : [];
  const source = valid.length > 0 ? valid : [fallback];
  return Array.from({ length: count }, (_, i) => source[i % source.length]);
}
