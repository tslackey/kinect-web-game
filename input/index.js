/**
 * Stub input adapter.
 * Later slices can swap this for webcam or Kinect while keeping the same sample shape.
 */

const IDLE_SOURCE = "idle";
const MOUSE_SOURCE = "mouse";

/**
 * @typedef {object} Joint
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 * @property {number} confidence
 */

/**
 * @typedef {object} PoseSample
 * @property {"idle" | "mouse"} source
 * @property {Record<string, Joint>} joints
 * @property {number} timestamp
 */

/**
 * @param {{ target?: EventTarget }} [options]
 */
export function createInput({ target = window } = {}) {
  /** @type {Joint | null} */
  let pointer = null;

  /**
   * @param {PointerEvent} event
   */
  function onPointer(event) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    pointer = {
      x: clamp01(event.clientX / width),
      y: clamp01(event.clientY / height),
      confidence: 1,
    };
  }

  target.addEventListener("pointermove", onPointer);
  target.addEventListener("pointerdown", onPointer);

  /** @returns {PoseSample} */
  function sample() {
    const timestamp = performance.now();
    if (!pointer) {
      return { source: IDLE_SOURCE, joints: {}, timestamp };
    }

    return {
      source: MOUSE_SOURCE,
      joints: { pointer: { ...pointer } },
      timestamp,
    };
  }

  function dispose() {
    target.removeEventListener("pointermove", onPointer);
    target.removeEventListener("pointerdown", onPointer);
  }

  return { sample, dispose };
}

/**
 * @param {number} value
 */
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
