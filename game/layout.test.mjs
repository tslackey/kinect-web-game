import {
  DEFAULT_PACK,
  FEED_DWELL,
  FEED_PET,
  HOT_POTATO,
  LAYOUT_COOP,
  LAYOUT_SPLIT,
  LEFT_LANE,
  MIRROR_ME,
  PET_PICKUP_DWELL,
  PLAY_DURATION,
  POTATO_PICKUP_DWELL,
  PROMPT_DURATION,
  RESULT_DURATION,
  RIGHT_LANE,
  WATER_PLANT,
  assignLanePoses,
  combineSplitOutcomes,
  createGame,
  liveLayoutFor,
  placeX,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idle() {
  return { source: "idle", poses: [], timestamp: 0 };
}

function oneBody(joints, id = "p1", source = "webcam") {
  return { source, poses: [{ id, source, joints }], timestamp: 0 };
}

function twoBodies(p1Joints, p2Joints, source = "webcam") {
  return {
    source,
    poses: [
      { id: "p1", source, joints: p1Joints },
      { id: "p2", source, joints: p2Joints },
    ],
    timestamp: 0,
  };
}

function drainGame(game, seconds, sample = idle()) {
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample);
  }
}

function skipPrompt(game, sample = idle()) {
  drainGame(game, PROMPT_DURATION, sample);
}

function skipResult(game, sample = idle()) {
  drainGame(game, RESULT_DURATION, sample);
}

function bothOn(x, y) {
  return {
    left_wrist: { x, y, confidence: 1 },
    right_wrist: { x, y, confidence: 1 },
  };
}

assert(WATER_PLANT.layout === LAYOUT_SPLIT, "carry trio defaults to split");
assert(FEED_PET.layout === LAYOUT_SPLIT, "feed pet is a split verb");
assert(HOT_POTATO.layout === LAYOUT_COOP, "hot potato is coop-center");
assert(MIRROR_ME.layout === LAYOUT_COOP, "mirror me is coop-center");
assert(liveLayoutFor(LAYOUT_SPLIT, "1p") === "solo", "1P never splits");
assert(liveLayoutFor(LAYOUT_COOP, "2p") === "coop", "2P coop stays coop");
assert(liveLayoutFor(LAYOUT_SPLIT, "2p") === "split", "2P split stays split");
assert(placeX(LEFT_LANE, 0.24) < 0.5, "left lane maps design x into the left half");
assert(placeX(RIGHT_LANE, 0.24) > 0.5, "right lane maps design x into the right half");
assert(placeX(undefined, 0.24) === 0.24, "full field keeps packed coordinates");
assert(combineSplitOutcomes("win", "fail", true, true) === "split", "mixed finished lanes are a split");
assert(combineSplitOutcomes("win", "win", true, true) === "win", "both wins are a win");
assert(combineSplitOutcomes("fail", "fail", true, true) === "fail", "both fails are a fail");
assert(combineSplitOutcomes("win", "playing", true, false) === "win", "an empty lane does not block a solo 2P win");

const assigned = assignLanePoses(
  twoBodies(
    { nose: { x: 0.2, y: 0.4, confidence: 1 } },
    { nose: { x: 0.8, y: 0.4, confidence: 1 } },
  ),
);
assert(assigned.p1.id === "p1", "leftmost body is P1");
assert(assigned.p2.id === "p2", "rightmost body is P2");

assert(
  DEFAULT_PACK.filter((def) => def.layout === LAYOUT_COOP).every(
    (def) => def.id === "hot-potato" || def.id === "mirror-me" || def.id === "cheers-toast" || def.id === "tug-of-war",
  ),
  "only true shared verbs opt into coop-center",
);

const solo = createGame({
  pack: [FEED_PET],
  games: 1,
  shuffle: false,
  playerMode: "1p",
  random: () => 0.2,
});
solo.start();
skipPrompt(solo);
assert(solo.getState().layout === "solo", "1P feed pet is a single full-field instance");
assert(solo.getState().scene?.lanes == null, "1P does not spawn a second bowl");
assert(solo.getState().scene?.bowl, "1P still exposes one bowl");
assert(solo.getState().scene?.pet, "1P still exposes one pet");
const soloBowl = solo.getState().scene.bowl;
const soloPet = solo.getState().scene.pet;
assert(Math.hypot(soloBowl.x - soloPet.x, soloBowl.y - soloPet.y) > 0.3, "1P bowl and pet sit on opposite sides");
drainGame(solo, PET_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: soloBowl.x, y: soloBowl.y, confidence: 1 } }));
drainGame(solo, FEED_DWELL + 0.05, oneBody({ left_wrist: { x: soloPet.x, y: soloPet.y, confidence: 1 } }));
assert(solo.getState().result === "win", "1P feed still resolves as a win");
assert(solo.getState().score === 1, "1P still uses a single score");
assert(solo.getState().scores.p1 === 1, "1P tally lives on P1");
assert(solo.getState().scores.p2 === 0, "1P does not invent a P2 score");

const split = createGame({
  pack: [FEED_PET],
  games: 1,
  shuffle: false,
  playerMode: "2p",
  random: () => 0.2,
});
split.start();
skipPrompt(split);
assert(split.getState().layout === "split", "2P feed pet uses the split layout");
const lanes = split.getState().scene?.lanes;
assert(Array.isArray(lanes) && lanes.length === 2, "2P feed pet shows two bowls/pets");
assert(lanes[0].bowl && lanes[0].pet, "P1 has a bowl and a pet");
assert(lanes[1].bowl && lanes[1].pet, "P2 has a bowl and a pet");
assert(lanes[0].bowl.x < 0.5 && lanes[0].pet.x < 0.5, "P1 props sit in the left lane");
assert(lanes[1].bowl.x > 0.5 && lanes[1].pet.x > 0.5, "P2 props sit in the right lane");

const p1Bowl = lanes[0].bowl;
const p1Pet = lanes[0].pet;
const p2Bowl = lanes[1].bowl;
const p2Pet = lanes[1].pet;
const p1Pick = twoBodies(
  { nose: { x: 0.22, y: 0.4, confidence: 1 }, left_wrist: { x: p1Bowl.x, y: p1Bowl.y, confidence: 1 } },
  { nose: { x: 0.78, y: 0.4, confidence: 1 }, left_wrist: { x: 0.96, y: 0.08, confidence: 1 } },
);
drainGame(split, PET_PICKUP_DWELL + 0.05, p1Pick);
assert(split.getState().scene.lanes[0].bowl.held === true, "P1 can pick up the left bowl");
assert(split.getState().scene.lanes[1].bowl.held === false, "P2 bowl stays put while P1 carries");
const p1Feed = twoBodies(
  { nose: { x: 0.22, y: 0.4, confidence: 1 }, left_wrist: { x: p1Pet.x, y: p1Pet.y, confidence: 1 } },
  { nose: { x: 0.78, y: 0.4, confidence: 1 }, left_wrist: { x: 0.96, y: 0.08, confidence: 1 } },
);
drainGame(split, FEED_DWELL + 0.05, p1Feed);
assert(split.getState().phase === "playing", "P1 finishing does not end P2's attempt");
assert(split.getState().scores.p1 === 1, "a split win only increments P1");
assert(split.getState().scores.p2 === 0, "P2 score stays 0 while they have not fed");
assert(split.getState().scene.lanes[0].pet.stage === 1, "P1 pet is fed");
assert(split.getState().scene.lanes[1].pet.stage === 0, "P2 pet stays hungry");

drainGame(split, PLAY_DURATION + 0.2, p1Feed);
assert(split.getState().result === "split", "timeout after one win is a split result");
assert(split.getState().playerResults.p1 === "win", "P1 stays a win");
assert(split.getState().playerResults.p2 === "fail", "P2 fails independently");
assert(split.getState().scores.p1 === 1, "split result does not double-count P1");
assert(split.getState().scores.p2 === 0, "P2 miss does not score");
assert(split.getState().score === 1, "session total is P1+P2");

const both = createGame({
  pack: [FEED_PET],
  games: 1,
  shuffle: false,
  playerMode: "2p",
  random: () => 0.2,
});
both.start();
skipPrompt(both);
const bothLanes = both.getState().scene.lanes;
const bothPick = twoBodies(
  {
    nose: { x: 0.2, y: 0.42, confidence: 1 },
    left_wrist: { x: bothLanes[0].bowl.x, y: bothLanes[0].bowl.y, confidence: 1 },
  },
  {
    nose: { x: 0.8, y: 0.42, confidence: 1 },
    left_wrist: { x: bothLanes[1].bowl.x, y: bothLanes[1].bowl.y, confidence: 1 },
  },
);
drainGame(both, PET_PICKUP_DWELL + 0.05, bothPick);
const bothFeed = twoBodies(
  {
    nose: { x: 0.2, y: 0.42, confidence: 1 },
    left_wrist: { x: both.getState().scene.lanes[0].pet.x, y: both.getState().scene.lanes[0].pet.y, confidence: 1 },
  },
  {
    nose: { x: 0.8, y: 0.42, confidence: 1 },
    left_wrist: { x: both.getState().scene.lanes[1].pet.x, y: both.getState().scene.lanes[1].pet.y, confidence: 1 },
  },
);
drainGame(both, FEED_DWELL + 0.05, bothFeed);
assert(both.getState().result === "win", "both feeding is a round win");
assert(both.getState().scores.p1 === 1 && both.getState().scores.p2 === 1, "each split win credits that player");
assert(both.getState().score === 2, "2P total is the sum of private scores");

const missBoth = createGame({
  pack: [FEED_PET],
  games: 1,
  shuffle: false,
  playerMode: "2p",
  random: () => 0.2,
});
missBoth.start();
skipPrompt(missBoth);
drainGame(
  missBoth,
  PLAY_DURATION + 0.2,
  twoBodies(
    { nose: { x: 0.2, y: 0.4, confidence: 1 }, left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
    { nose: { x: 0.8, y: 0.4, confidence: 1 }, left_wrist: { x: 0.95, y: 0.05, confidence: 1 } },
  ),
);
assert(missBoth.getState().result === "fail", "both missing is a fail");
assert(missBoth.getState().scores.p1 === 0 && missBoth.getState().scores.p2 === 0, "a double miss scores nobody");

const coop = createGame({
  pack: [HOT_POTATO],
  games: 1,
  shuffle: false,
  playerMode: "2p",
  random: () => 0.2,
});
coop.start();
skipPrompt(coop);
assert(coop.getState().layout === "coop", "hot potato stays coop-center in 2P");
assert(coop.getState().scene?.lanes == null, "coop does not mirror a second potato");
const potato = coop.getState().scene.potato;
assert(Math.abs(potato.x - 0.5) < 0.08, "the shared potato spawns in the middle");
drainGame(coop, POTATO_PICKUP_DWELL + 0.05, oneBody({ left_wrist: { x: potato.x, y: potato.y, confidence: 1 } }));
coop.tick(1 / 60, oneBody(bothOn(0.5, 0.5)));
coop.tick(
  1 / 60,
  twoBodies(bothOn(0.5, 0.5), { nose: { x: 0.7, y: 0.4, confidence: 1 }, left_wrist: { x: 0.5, y: 0.5, confidence: 1 } }),
);
assert(coop.getState().result === "win", "a shared pass still wins");
assert(coop.getState().scores.p1 === 1, "coop success credits P1");
assert(coop.getState().scores.p2 === 1, "coop success credits P2");
assert(coop.getState().score === 2, "both scores move on a shared win");
assert(coop.getState().playerResults.p1 === "win" && coop.getState().playerResults.p2 === "win", "coop records a shared win");

skipResult(coop);
assert(coop.getState().phase === "over", "the coop session still ends after the result beat");

console.log("game/layout.test.mjs passed");
