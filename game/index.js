/**
 * Game state owner. Later slices add verbs here; this one only advances a marker.
 */

/**
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 * @typedef {import("../input/index.js").Joint} Joint
 */

/**
 * @typedef {object} Marker
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 */

/**
 * @typedef {object} GameState
 * @property {number} elapsed Seconds since the loop started.
 * @property {number} ticks
 * @property {string} inputSource
 * @property {Marker} marker
 * @property {PoseSample | null} pose
 */

/**
 * @returns {{ tick: (dt: number, sample: PoseSample) => GameState, getState: () => GameState }}
 */
export function createGame() {
  /** @type {GameState} */
  const state = {
    elapsed: 0,
    ticks: 0,
    inputSource: "idle",
    marker: { x: 0.5, y: 0.5 },
    pose: null,
  };

  /**
   * @param {number} dt Seconds since last tick.
   * @param {PoseSample} sample
   */
  function tick(dt, sample) {
    const step = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    state.elapsed += step;
    state.ticks += 1;
    state.pose = sample;
    state.inputSource = sample?.source ?? "idle";

    const aim = pickAim(sample?.joints) ?? idleAim(state.elapsed);
    const follow = 1 - Math.exp(-step * 8);
    state.marker.x += (aim.x - state.marker.x) * follow;
    state.marker.y += (aim.y - state.marker.y) * follow;

    return state;
  }

  function getState() {
    return state;
  }

  return { tick, getState };
}

/**
 * @param {Record<string, Joint> | undefined} joints
 * @returns {Joint | null}
 */
function pickAim(joints) {
  if (!joints) return null;
  const aim = joints.pointer ?? joints.nose ?? null;
  if (!aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y)) return null;
  return aim;
}

/**
 * Idle path so the loop is visibly alive before any pointer input.
 * @param {number} elapsed
 * @returns {Marker}
 */
function idleAim(elapsed) {
  return {
    x: 0.5 + Math.cos(elapsed * 1.15) * 0.28,
    y: 0.52 + Math.sin(elapsed * 0.85) * 0.2,
  };
}
