import { HIT_RADIUS } from "./hit.js";
import { OFFER_HOLD, createStickyCarry, overlapsCarry } from "./carry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * @param {string} poseId
 * @param {string} name
 * @param {number} x
 * @param {number} y
 */
function hand(poseId, name, x, y) {
  return { id: `${poseId}:${name}`, poseId, name, x, y, confidence: 1 };
}

/**
 * @param {ReturnType<typeof createStickyCarry>} carry
 * @param {number} seconds
 * @param {import("./hit.js").IdentifiedStriker[]} strikers
 */
function drain(carry, seconds, strikers) {
  const steps = Math.ceil(seconds / (1 / 60)) + 1;
  let view = carry.tick(strikers, 0);
  for (let i = 0; i < steps; i += 1) {
    view = carry.tick(strikers, 1 / 60);
  }
  return view;
}

assert(OFFER_HOLD > 0 && OFFER_HOLD <= 1.2, "offer hold is a short readable window");
assert(overlapsCarry({ x: 0.2, y: 0.2 }, { x: 0.2 + HIT_RADIUS, y: 0.2 }), "edge of the hit zone still overlaps");
assert(!overlapsCarry({ x: 0.2, y: 0.2 }, { x: 0.9, y: 0.9 }), "far points do not overlap");

const pickup = createStickyCarry({ pickupDwell: 0.4 });
pickup.reset({ x: 0.3, y: 0.6 });
assert(pickup.heldBy === null && pickup.offered === false, "carry starts free");
drain(pickup, 0.25, [hand("p1", "left_wrist", 0.3, 0.6)]);
assert(pickup.heldBy === null, "a short hover does not stick");
const stuck = drain(pickup, 0.2, [hand("p1", "left_wrist", 0.3, 0.6)]);
assert(stuck.heldBy === "p1:left_wrist", "hover dwell sticks the first hand");
assert(stuck.offered === false, "one hand is not an offer");
const followed = pickup.tick([hand("p1", "left_wrist", 0.41, 0.55)], 1 / 60);
assert(Math.abs(followed.x - 0.41) < 0.0001, "the item follows the owner");

const steal = createStickyCarry({ pickupDwell: 0.4 });
steal.reset({ x: 0.24, y: 0.66 });
drain(steal, 0.45, [hand("p1", "left_wrist", 0.24, 0.66)]);
const thief = steal.tick(
  [
    hand("p1", "left_wrist", 0.4, 0.5),
    hand("p2", "right_wrist", 0.4, 0.5),
  ],
  1 / 60,
);
assert(thief.heldBy === "p1:left_wrist", "a non-owner single hand cannot steal without an offer");
assert(thief.offered === false, "one owner hand plus a thief is not offered");
assert(Math.abs(thief.x - 0.4) < 0.0001, "the item still follows the owner during the steal attempt");

const pass = createStickyCarry({ pickupDwell: 0.4 });
pass.reset({ x: 0.22, y: 0.68 });
drain(pass, 0.45, [hand("p1", "left_wrist", 0.22, 0.68)]);
const offering = pass.tick(
  [
    hand("p1", "left_wrist", 0.5, 0.5),
    hand("p1", "right_wrist", 0.5, 0.5),
  ],
  1 / 60,
);
assert(offering.offered === true, "two owner hands on the item latch offered");
assert(offering.heldBy === "p1:left_wrist", "the offering second hand does not instantly take it");

const stillOffered = pass.tick(
  [
    hand("p1", "left_wrist", 0.5, 0.5),
    hand("p1", "right_wrist", 0.5, 0.5),
  ],
  1 / 60,
);
assert(stillOffered.offered === true, "holding both hands keeps the offer live");
assert(stillOffered.heldBy === "p1:left_wrist", "same-body second hand is the offer, not the accept");

const taken = pass.tick(
  [
    hand("p1", "left_wrist", 0.5, 0.5),
    hand("p1", "right_wrist", 0.5, 0.5),
    hand("p2", "left_wrist", 0.5, 0.5),
  ],
  1 / 60,
);
assert(taken.heldBy === "p2:left_wrist", "one hand from the other body accepts the offer");
assert(taken.offered === false, "accept ends the offered state");
assert(Math.abs(taken.x - 0.5) < 0.0001, "the item follows the new owner");

const bounce = pass.tick(
  [
    hand("p1", "left_wrist", 0.5, 0.5),
    hand("p1", "right_wrist", 0.5, 0.5),
    hand("p2", "left_wrist", 0.5, 0.5),
  ],
  1 / 60,
);
assert(bounce.heldBy === "p2:left_wrist", "the old owner cannot snatch it back on the same contact");
assert(bounce.offered === false, "a fresh offer needs the new owner to two-hand");

const swap = createStickyCarry({ pickupDwell: 0.4 });
swap.reset({ x: 0.3, y: 0.6 });
drain(swap, 0.45, [hand("p1", "left_wrist", 0.3, 0.6)]);
swap.tick(
  [
    hand("p1", "left_wrist", 0.44, 0.5),
    hand("p1", "right_wrist", 0.44, 0.5),
  ],
  1 / 60,
);
assert(swap.offered === true, "same-body two-hand contact offers");
swap.tick([hand("p1", "left_wrist", 0.44, 0.5)], 1 / 60);
assert(swap.offered === true, "offer stays live after the second hand leaves");
assert(swap.heldBy === "p1:left_wrist", "leaving the second hand is not yet the accept");
const swapped = swap.tick(
  [
    hand("p1", "left_wrist", 0.44, 0.5),
    hand("p1", "right_wrist", 0.44, 0.5),
  ],
  1 / 60,
);
assert(swapped.heldBy === "p1:right_wrist", "re-grab with the other hand accepts on the same body");
assert(swapped.offered === false, "hand-swap accept clears the offer");

const expire = createStickyCarry({ pickupDwell: 0.4 });
expire.reset({ x: 0.2, y: 0.2 });
drain(expire, 0.45, [hand("p1", "left_wrist", 0.2, 0.2)]);
expire.tick(
  [
    hand("p1", "left_wrist", 0.3, 0.3),
    hand("p1", "right_wrist", 0.3, 0.3),
  ],
  1 / 60,
);
drain(expire, OFFER_HOLD + 0.05, [hand("p1", "left_wrist", 0.3, 0.3)]);
assert(expire.offered === false, "an unused offer expires after the hold window");
const tooLate = expire.tick(
  [
    hand("p1", "left_wrist", 0.3, 0.3),
    hand("p2", "right_wrist", 0.3, 0.3),
  ],
  1 / 60,
);
assert(tooLate.heldBy === "p1:left_wrist", "accept after the offer expires is still a blocked steal");

const solo = createStickyCarry({ pickupDwell: 0.4 });
solo.reset({ x: 0.7, y: 0.6 });
const pointer = drain(solo, 0.45, [hand("p1", "pointer", 0.7, 0.6)]);
assert(pointer.heldBy === "p1:pointer", "pointer stand-in can still pick up when it is the only hand");
assert(pointer.offered === false, "a single pointer cannot two-hand offer");

console.log("game/carry.test.mjs passed");
