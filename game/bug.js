/**
 * First feet-verb microgame: stomp the bug.
 * Hover an ankle over the bug ~0.35s, or drive an ankle through it.
 * Timeout is the only fail. Wrists do not score.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { FOOT_STRIKER_NAMES, HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";

export const BUG_DURATION = PLAY_DURATION;
export const STOMP_DWELL = 0.35;
/** Travel in one tick that counts as driving a foot through the bug. */
export const STOMP_DRIVE = 0.08;

const FIELD = { x0: 0.16, x1: 0.84, y0: 0.68, y1: 0.88 };
const SPAWN_CLEARANCE = 0.18;
const DRIFT_MIN = 0.03;
const DRIFT_SPAN = 0.035;

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} BugScene
 * @property {"stomp-bug"} kind
 * @property {{ x: number, y: number, stage: number }} bug
 * @property {boolean} squashing
 */

/**
 * @param {() => number} random
 * @param {number} id
 * @param {{ x: number, y: number }[]} [avoid]
 * @returns {Target}
 */
export function makeBug(random, id, avoid = []) {
  let x = lerp(FIELD.x0, FIELD.x1, random());
  let y = lerp(FIELD.y0, FIELD.y1, random());

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clear = avoid.every((point) => Math.hypot(point.x - x, point.y - y) >= SPAWN_CLEARANCE);
    if (clear) break;
    x = lerp(FIELD.x0, FIELD.x1, random());
    y = lerp(FIELD.y0, FIELD.y1, random());
  }

  const angle = random() * Math.PI * 2;
  const speed = DRIFT_MIN + random() * DRIFT_SPAN;
  return {
    id,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * Slow orb-style bounce, kept near the bottom of the field.
 *
 * @param {Target} target
 * @param {number} step
 */
export function driftBug(target, step) {
  target.x += target.vx * step;
  target.y += target.vy * step;

  if (target.x < FIELD.x0 || target.x > FIELD.x1) {
    target.vx *= -1;
    target.x = clamp(target.x, FIELD.x0, FIELD.x1);
  }
  if (target.y < FIELD.y0 || target.y > FIELD.y1) {
    target.vy *= -1;
    target.y = clamp(target.y, FIELD.y0, FIELD.y1);
  }
}

export const STOMP_BUG = defineMicrogame({
  id: "stomp-bug",
  prompt: "Stomp bug",
  duration: BUG_DURATION,
  create({ random, duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BUG_DURATION;
    let nextId = 1;
    /** @type {Target} */
    let bug = makeBug(random, nextId++);
    /** @type {Map<string, number>} */
    const hover = new Map();
    /** @type {Map<string, { x: number, y: number }>} */
    const lastPos = new Map();
    let squashing = false;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    /**
     * @returns {MicrogamePlay}
     */
    function api() {
      return {
        start() {
          bug = makeBug(random, nextId++);
          hover.clear();
          lastPos.clear();
          squashing = false;
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
          driftBug(bug, step);

          const strikers = listIdentifiedStrikers(sample, FOOT_STRIKER_NAMES);
          squashing = false;
          const seen = new Set();

          for (const striker of strikers) {
            seen.add(striker.id);
            const over = overlaps(striker, bug);
            const prev = lastPos.get(striker.id);
            if (over) {
              squashing = true;
              const travel = prev ? Math.hypot(striker.x - prev.x, striker.y - prev.y) : 0;
              const wasOut = !prev || !overlaps(prev, bug);
              if (wasOut && travel >= STOMP_DRIVE) {
                return squash();
              }
              const held = (hover.get(striker.id) ?? 0) + step;
              hover.set(striker.id, held);
              if (held >= STOMP_DWELL) {
                return squash();
              }
            } else {
              hover.set(striker.id, 0);
            }
            lastPos.set(striker.id, { x: striker.x, y: striker.y });
          }

          for (const id of hover.keys()) {
            if (!seen.has(id)) hover.set(id, 0);
          }
          for (const id of lastPos.keys()) {
            if (!seen.has(id)) lastPos.delete(id);
          }

          timeLeft = Math.max(0, timeLeft - step);
          if (timeLeft <= 0) {
            outcome = "fail";
            return "fail";
          }
          return "playing";
        },
        getView() {
          return {
            target: bug,
            timeLeft,
            lifetime,
            scene: {
              kind: "stomp-bug",
              bug: { x: bug.x, y: bug.y, stage: outcome === "win" ? 1 : 0 },
              squashing: squashing || outcome === "win",
            },
          };
        },
      };
    }

    function squash() {
      bug.vx = 0;
      bug.vy = 0;
      squashing = true;
      outcome = "win";
      return "win";
    }

    return api();
  },
});

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function overlaps(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
