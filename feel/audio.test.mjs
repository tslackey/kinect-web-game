import { createAudio, MUTE_KEY } from "./audio.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeContext() {
  /** @type {{ type: string, freq: number[], started: number[], stopped: number[] }[]} */
  const oscillators = [];

  return {
    oscillators,
    currentTime: 1.25,
    state: "running",
    destination: {},
    resume() {
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator() {
      /** @type {{ type: string, freq: number[], started: number[], stopped: number[] }} */
      const rec = { type: "sine", freq: [], started: [], stopped: [] };
      oscillators.push(rec);
      return {
        type: "sine",
        frequency: {
          /**
           * @param {number} value
           */
          setValueAtTime(value) {
            rec.freq.push(value);
          },
          /**
           * @param {number} value
           */
          exponentialRampToValueAtTime(value) {
            rec.freq.push(value);
          },
        },
        connect() {},
        /**
         * @param {number} when
         */
        start(when) {
          rec.started.push(when);
        },
        /**
         * @param {number} when
         */
        stop(when) {
          rec.stopped.push(when);
        },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  };
}

const memory = new Map();
const storage = {
  /**
   * @param {string} key
   */
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  /**
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    memory.set(key, value);
  },
};

const ctx = fakeContext();
const audio = createAudio({
  context: /** @type {AudioContext} */ (/** @type {unknown} */ (ctx)),
  storage,
});

assert(audio.isMuted() === false, "audio should start unmuted");
audio.play("hit");
assert(ctx.oscillators.length === 2, "a hit should play a two-note cue");
assert(ctx.oscillators[0].started.length === 1, "the hit cue should start");

audio.setMuted(true);
assert(audio.isMuted() === true, "setMuted should mute");
assert(storage.getItem(MUTE_KEY) === "1", "mute should persist");
const before = ctx.oscillators.length;
audio.play("miss");
assert(ctx.oscillators.length === before, "muted play should be a no-op");

assert(audio.toggle() === false, "toggle should unmute");
audio.play("over");
assert(ctx.oscillators.length > before, "an unmuted game-over cue should play");

audio.setMuted(true);
const mutedFresh = createAudio({
  context: /** @type {AudioContext} */ (/** @type {unknown} */ (fakeContext())),
  storage,
});
assert(mutedFresh.isMuted() === true, "a new mixer should read the stored mute");

const silent = createAudio({
  contextFactory: () => {
    throw new Error("should not build a context when muted");
  },
  storage: {
    getItem() {
      return "1";
    },
    setItem() {},
  },
});
silent.play("hit");

console.log("feel/audio.test.mjs passed");
