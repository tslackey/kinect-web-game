/**
 * Optional Web Audio cues. Mute is sticky. No sound files; tones are synthesized.
 */

export const MUTE_KEY = "kinect-web-game:mute";

/**
 * @param {{
 *   context?: AudioContext | null,
 *   contextFactory?: () => AudioContext,
 *   storage?: Pick<Storage, "getItem" | "setItem"> | null,
 *   now?: () => number,
 * }} [options]
 */
export function createAudio({
  context = null,
  contextFactory,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  now,
} = {}) {
  let muted = storage?.getItem(MUTE_KEY) === "1";
  /** @type {AudioContext | null} */
  let ctx = context ?? null;

  function ensureContext() {
    if (muted) return null;
    if (!ctx) {
      const make =
        contextFactory ??
        (typeof AudioContext !== "undefined"
          ? () => new AudioContext()
          : typeof window !== "undefined" && "webkitAudioContext" in window
            ? () => new window.webkitAudioContext()
            : null);
      if (!make) return null;
      ctx = make();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  }

  /**
   * @param {"hit" | "miss" | "over"} kind
   */
  function play(kind) {
    const audio = ensureContext();
    if (!audio) return;

    const t0 = now ? now() : audio.currentTime;
    if (kind === "hit") {
      blip(audio, t0, { freq: 523, dur: 0.09, gain: 0.07, type: "triangle" });
      blip(audio, t0 + 0.055, { freq: 784, dur: 0.12, gain: 0.06, type: "triangle" });
      return;
    }
    if (kind === "miss") {
      blip(audio, t0, { freq: 196, dur: 0.18, gain: 0.05, type: "sine", slide: 140 });
      return;
    }
    blip(audio, t0, { freq: 330, dur: 0.14, gain: 0.05, type: "sine", slide: 247 });
    blip(audio, t0 + 0.14, { freq: 220, dur: 0.22, gain: 0.05, type: "sine", slide: 165 });
  }

  /**
   * @param {boolean} next
   */
  function setMuted(next) {
    muted = Boolean(next);
    try {
      storage?.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // Private mode can throw. Mute still applies for this session.
    }
  }

  function toggle() {
    setMuted(!muted);
    return muted;
  }

  return {
    play,
    setMuted,
    toggle,
    isMuted() {
      return muted;
    },
  };
}

/**
 * @param {AudioContext} audio
 * @param {number} when
 * @param {{ freq: number, dur: number, gain: number, type: OscillatorType, slide?: number }} tone
 */
function blip(audio, when, tone) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = tone.type;
  osc.frequency.setValueAtTime(tone.freq, when);
  if (tone.slide != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.slide), when + tone.dur);
  }
  gain.gain.setValueAtTime(tone.gain, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(when);
  osc.stop(when + tone.dur + 0.02);
}
