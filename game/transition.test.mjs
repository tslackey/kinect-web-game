import {
  DEFAULT_CURTAIN_TIMINGS,
  DUCK_BEAM,
  ORB_HIT,
  PLAY_DURATION,
  PROMPT_DURATION,
  REDUCED_CURTAIN_TIMINGS,
  RESULT_DURATION,
  createGame,
  createTransition,
  easeInOutCubic,
  interstitialDuration,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle() {
  return { source: "idle", poses: [], timestamp: 0 };
}

function drain(game, seconds, sample = idle()) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample);
  }
}

assert(DEFAULT_CURTAIN_TIMINGS.down >= 0.7, "curtain down is a readable drop");
assert(DEFAULT_CURTAIN_TIMINGS.covered >= 0.22, "the hidden swap beat is a real pause");
assert(DEFAULT_CURTAIN_TIMINGS.up >= 0.65, "curtain up is a readable rise");
assert(DEFAULT_CURTAIN_TIMINGS.hold >= 1.45, "the placard hold is long enough to read");
assert(interstitialDuration() > 2.8, "the interstitial is clearly longer than the old ~2.3s wipe");
assert(interstitialDuration() <= 4.2, "the beat is longer, not endless");
assert(REDUCED_CURTAIN_TIMINGS.hold >= 0.95, "reduced-motion still holds a readable title");
assert(
  Math.abs(PROMPT_DURATION - interstitialDuration()) < 1e-9,
  "the prompt beat is the curtain interstitial",
);
assert(
  interstitialDuration({ reducedMotion: true }) < interstitialDuration(),
  "reduced-motion uses the shorter path",
);
assert(
  interstitialDuration({ reducedMotion: true }) ===
    REDUCED_CURTAIN_TIMINGS.down +
      REDUCED_CURTAIN_TIMINGS.covered +
      REDUCED_CURTAIN_TIMINGS.up +
      REDUCED_CURTAIN_TIMINGS.hold,
  "reduced timings live in one place",
);
assert(easeInOutCubic(0) === 0, "easing starts at 0");
assert(easeInOutCubic(1) === 1, "easing ends at 1");
assert(easeInOutCubic(0.5) === 0.5, "cubic ease is symmetric");

const curtain = createTransition();
let view = curtain.toNext({ title: "Duck beam", backgroundId: "beam" });
assert(view.phase === "down", "toNext starts the curtain coming down");
assert(view.title === "Duck beam", "title is configurable");
assert(view.backgroundId === "beam", "background id rides with toNext");
assert(view.cover < 0.2, "the curtain starts open-ish");
assert(view.readyToSwap === false, "do not swap until covered");
assert(view.placard === false, "the placard waits for curtain up");

view = curtain.tick(DEFAULT_CURTAIN_TIMINGS.down);
assert(view.phase === "covered" || view.cover === 1, "after down the field is covered");
assert(view.readyToSwap === true, "the covered beat is when the session swaps the stage");
assert(view.cover === 1, "cover is closed while hidden");

view = curtain.consumeSwap();
assert(view.swapped === true, "consumeSwap marks the mid-curtain swap");
assert(view.readyToSwap === false, "swap is one-shot");

view = curtain.tick(DEFAULT_CURTAIN_TIMINGS.covered);
assert(view.phase === "up" || view.placard === true, "curtain up reveals the placard");
assert(view.placard === true, "title placard shows as the curtain draws back");

const holdStart = curtain.tick(DEFAULT_CURTAIN_TIMINGS.up);
assert(holdStart.phase === "hold" || holdStart.placard === true, "up hands off to the placard hold");
assert(holdStart.placardScale > 1 && holdStart.placardScale <= 1.08, "reveal uses a modest scale pulse");

const afterUp = curtain.tick(DEFAULT_CURTAIN_TIMINGS.hold);
assert(afterUp.done === true, "hold then play — the interstitial completes");
assert(afterUp.cover === 0, "the curtain is open when done");
assert(Math.abs(afterUp.placardScale - 1) < 0.02, "the pulse settles before play");

const reduced = createTransition({ reducedMotion: true });
reduced.toNext({ title: "Jump bar", backgroundId: "bar" });
assert(reduced.getView().placardScale === 1, "reduced-motion skips the scale pulse");
const reducedDone = reduced.tick(interstitialDuration({ reducedMotion: true }) + 0.01);
assert(reducedDone.done === true, "the short path still finishes");
assert(reduced.getView().title === "Jump bar", "reduced-motion keeps the title");

const session = createGame({
  pack: [ORB_HIT, DUCK_BEAM],
  games: 2,
  shuffle: false,
  random: () => 0.2,
});
session.start();
assert(session.getState().phase === "prompt", "Play opens on the curtain interstitial");
assert(session.getState().transition?.title === "Hit orb", "session start calls toNext with the prompt");
assert(session.getState().gameId === "orb-hit", "session start may reveal the first stage immediately");
assert(session.getState().backgroundId === "crystal", "the first background is live under the first curtain");

drain(session, PROMPT_DURATION);
assert(session.getState().phase === "playing", "curtain hold hands off to play");
assert(session.getState().transition === null, "the curtain clears once play starts");

drain(session, PLAY_DURATION + 0.1);
assert(session.getState().phase === "result", "timeout still resolves the orb");
drain(session, RESULT_DURATION);

assert(session.getState().phase === "prompt", "the next game starts behind a curtain");
assert(session.getState().prompt === "Duck beam", "placard title defaults to the next prompt");
assert(session.getState().transition?.backgroundId === "beam", "toNext carries the next stage id");
assert(
  session.getState().scene?.kind !== "duck-beam",
  "the next stage must not pop in before the curtain covers",
);
assert(session.getState().gameId === "orb-hit", "the finished game stays aimed until the swap beat");

drain(session, DEFAULT_CURTAIN_TIMINGS.down + DEFAULT_CURTAIN_TIMINGS.covered);
assert(session.getState().scene?.kind === "duck-beam", "the stage swaps while covered");
assert(session.getState().backgroundId === "beam", "backgroundId updates on the hidden beat");
assert(session.getState().gameId === "duck-beam", "the live id follows the swap");
assert(session.getState().phase === "prompt", "play waits for curtain up and the placard hold");
assert(session.getState().transition?.placard === true, "curtain up shows the big title");

drain(session, DEFAULT_CURTAIN_TIMINGS.up + DEFAULT_CURTAIN_TIMINGS.hold);
assert(session.getState().phase === "playing", "after the placard, the next verb is live");

const instant = createGame({
  pack: [DUCK_BEAM],
  games: 1,
  reducedMotion: true,
  shuffle: false,
});
instant.start();
drain(instant, interstitialDuration({ reducedMotion: true }));
assert(instant.getState().phase === "playing", "reduced-motion still reaches play");

console.log("game/transition.test.mjs passed");
