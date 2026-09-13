/**
 * Microgame contract. A later pack plugs into the session with these fields:
 * prompt, duration, win, fail, next.
 *
 * Loop: curtain + title placard → one game on a 15–20s timer → win or fail → next.
 * Win / fail are timeout-or-success, never “wrong gesture.”
 * Play ticks see 1 or 2 pose maps from one webcam sample (not one cam per player).
 */

import { interstitialDuration } from "./transition.js";

export const GAME_COUNT = 4;
/** Curtain down → swap → curtain up + placard hold. Lives in transition.js. */
export const PROMPT_DURATION = interstitialDuration();
export const RESULT_DURATION = 0.9;
/** Default play window after the prompt. Kids-feel floor is 15s; stay in 15–20. */
export const PLAY_DURATION = 18;

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
 * @property {object | null} [scene]
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
 * @property {string} [title] Placard text; defaults to prompt
 * @property {string} [backgroundId] Stage set swapped while the curtain is closed
 * @property {string} [subtitle]
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
 * Fisher-Yates shuffle using the session random.
 *
 * @param {MicrogameDef[]} pack
 * @param {() => number} [random]
 * @returns {MicrogameDef[]}
 */
export function shufflePack(pack, random) {
  const list = pack.slice();
  if (typeof random !== "function" || list.length < 2) return list;
  for (let i = list.length - 1; i > 0; i -= 1) {
    const roll = random();
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * (i + 1))));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/**
 * Build the session sequence. A pack is a list of defs; it repeats to fill
 * `games` if needed. Invalid defs are skipped. Pass `random` to shuffle so
 * a long pack can feed a short default session. The session, not the pack,
 * advances to next after win or fail.
 *
 * @param {unknown} pack
 * @param {number} games
 * @param {MicrogameDef} fallback
 * @param {() => number} [random]
 * @returns {MicrogameDef[]}
 */
export function sequenceFromPack(pack, games, fallback, random) {
  const count = Math.max(1, Math.floor(games) || GAME_COUNT);
  const valid = Array.isArray(pack) ? pack.filter(isMicrogameDef) : [];
  const source = valid.length > 0 ? valid : [fallback];
  const ordered = shufflePack(source, random);
  return Array.from({ length: count }, (_, i) => ordered[i % ordered.length]);
}
