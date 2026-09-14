/**
 * Shared timeout-or-success play wrapper. Simple microgames opt in so
 * each file does not reinvent the timer. Fail is timeout, or an early
 * miss the verb names (freeze after the cue, bar contact, trip).
 */

/**
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./microgame.js").MicrogameView} MicrogameView
 * @typedef {import("./microgame.js").MicrogameOutcome} MicrogameOutcome
 * @typedef {import("../input/poses.js").PoseSample} PoseSample
 */

/**
 * @param {object} options
 * @param {number} options.lifetime
 * @param {() => void} options.reset
 * @param {(dt: number, sample: PoseSample) => "win" | "fail" | "playing"} options.step
 * @param {() => Partial<MicrogameView>} options.view
 * @returns {MicrogamePlay}
 */
export function createTimedPlay({ lifetime, reset, step, view }) {
  const limit = Number.isFinite(lifetime) && lifetime > 0 ? lifetime : 18;
  let timeLeft = limit;
  /** @type {MicrogameOutcome} */
  let outcome = "playing";

  return {
    start() {
      timeLeft = limit;
      outcome = "playing";
      reset();
    },
    /**
     * @param {number} dt
     * @param {PoseSample} sample
     */
    tick(dt, sample) {
      if (outcome !== "playing") return outcome;
      const slice = Number.isFinite(dt) ? Math.max(0, dt) : 0;
      const result = step(slice, sample);
      if (result === "win" || result === "fail") {
        outcome = result;
        return result;
      }
      timeLeft = Math.max(0, timeLeft - slice);
      if (timeLeft <= 0) {
        outcome = "fail";
        return "fail";
      }
      return "playing";
    },
    getView() {
      return { timeLeft, lifetime: limit, ...view() };
    },
  };
}
