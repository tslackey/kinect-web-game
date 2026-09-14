/**
 * Pop the balloons (#94): slap a quota of rising balloons.
 * Escalation cousin of Swat the fly / Hit orb. Timeout before quota fails.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { FULL_LANE, fieldInLane, placeX } from "./layout.js";

export const BALLOON_DURATION = PLAY_DURATION;
export const BALLOON_QUOTA = 3;
export const BALLOON_RISE = 0.16;

const FIELD = { x0: 0.16, x1: 0.84, y0: 0.12, y1: 0.88 };

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("./orb.js").Target} Target
 */

/**
 * @typedef {object} BalloonScene
 * @property {"pop-balloons"} kind
 * @property {{ x: number, y: number, id: number }[]} balloons
 * @property {number} popped
 * @property {number} quota
 */

/**
 * @param {() => number} random
 * @param {number} id
 * @param {{ x0: number, x1: number, y0: number, y1: number }} field
 * @param {import("./layout.js").Lane} lane
 * @returns {Target}
 */
export function makeBalloon(random, id, field, lane) {
  const box = field ?? FIELD;
  return {
    id,
    x: lerp(box.x0, box.x1, 0.2 + random() * 0.6),
    y: lerp(0.62, 0.86, random()),
    vx: (random() - 0.5) * 0.08,
    vy: -(BALLOON_RISE + random() * 0.05),
  };
}

export const POP_BALLOONS = defineMicrogame({
  id: "pop-balloons",
  prompt: "Pop!",
  backgroundId: "crystal",
  duration: BALLOON_DURATION,
  create({ random, duration, lane = FULL_LANE }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : BALLOON_DURATION;
    const field = fieldInLane(lane, FIELD);
    let nextId = 1;
    /** @type {Target[]} */
    let balloons = [];
    let popped = 0;
    let timeLeft = lifetime;
    /** @type {"playing" | "win" | "fail"} */
    let outcome = "playing";

    function spawn() {
      balloons.push(makeBalloon(random, nextId++, field, lane));
    }

    return {
      start() {
        balloons = [];
        popped = 0;
        timeLeft = lifetime;
        outcome = "playing";
        spawn();
        spawn();
      },
      /**
       * @param {number} dt
       * @param {PoseSample} sample
       */
      tick(dt, sample) {
        if (outcome !== "playing") return outcome;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        const strikers = listIdentifiedStrikers(sample);
        const live = [];
        for (const balloon of balloons) {
          balloon.x = clamp(balloon.x + balloon.vx * step, field.x0, field.x1);
          balloon.y += balloon.vy * step;
          const hit = strikers.some((joint) => Math.hypot(joint.x - balloon.x, joint.y - balloon.y) <= HIT_RADIUS);
          if (hit) {
            popped += 1;
            if (popped >= BALLOON_QUOTA) {
              outcome = "win";
              return "win";
            }
            spawn();
            continue;
          }
          if (balloon.y < field.y0) {
            spawn();
            continue;
          }
          live.push(balloon);
        }
        balloons = live;
        if (balloons.length < 2 && popped < BALLOON_QUOTA) spawn();
        timeLeft = Math.max(0, timeLeft - step);
        if (timeLeft <= 0) {
          outcome = "fail";
          return "fail";
        }
        return "playing";
      },
      getView() {
        const aim = balloons[0] ?? { id: 0, x: placeX(lane, 0.5), y: 0.5, vx: 0, vy: 0 };
        return {
          target: aim,
          timeLeft,
          lifetime,
          scene: {
            kind: "pop-balloons",
            balloons: balloons.map((item) => ({ id: item.id, x: item.x, y: item.y })),
            popped,
            quota: BALLOON_QUOTA,
          },
        };
      },
    };
  },
});

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
