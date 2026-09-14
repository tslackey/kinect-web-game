/**
 * Facet player skeletons. Low-poly skin over the pose, eyes, and a
 * small expression set. Light from upper-left. Strikers stay on top.
 */

import { STICK_BONES } from "../input/joints.js";
import { FACET, FACET_RGB, PLAYER_RGB } from "../theme/facet.js";
import { drawFaces, facetShade, fillDiamond } from "./facet.js";

/**
 * @typedef {import("./facet.js").Face} Face
 * @typedef {import("./facet.js").Pt} Pt
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {"idle" | "effort" | "win" | "fail"} SkeletonMood
 * @typedef {"moss" | "sky"} PlayerHue
 */

export const PLAYER_HUES = /** @type {const} */ (["moss", "sky"]);

/** Player-color core of a striker diamond. Bone halo sits outside so it reads on skin. */
export const STRIKER_RADIUS = 7;
export const STRIKER_HALO = 10;

const FACE_JOINTS = new Set([
  "nose",
  "left_eye",
  "right_eye",
  "left_eye_inner",
  "right_eye_inner",
  "left_eye_outer",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
]);

const LIMB_BONES = STICK_BONES.filter(
  ([from, to]) =>
    !(from === "left_shoulder" && to === "right_shoulder") &&
    !(from === "left_hip" && to === "right_hip"),
);

/**
 * Visual-only. Idle on start / prompt, effort while playing,
 * win / fail from the result beat. In 2P split, pass `player` so a
 * mixed round can smile on one body and miss on the other.
 *
 * @param {{
 *   phase?: string,
 *   result?: string | null,
 *   playerResults?: { p1?: string, p2?: string } | null,
 * } | null | undefined} state
 * @param {"p1" | "p2"} [player]
 * @returns {SkeletonMood}
 */
export function skeletonMood(state, player) {
  if (!state) return "idle";
  if ((player === "p1" || player === "p2") && (state.phase === "result" || state.phase === "over")) {
    const own = state.playerResults?.[player];
    if (own === "win" || own === "fail") return own;
  }
  if (state.phase === "result" && state.result === "win") return "win";
  if (state.phase === "over" || (state.phase === "result" && state.result === "fail")) return "fail";
  if (state.phase === "playing") return "effort";
  return "idle";
}

/**
 * @param {number} index
 * @returns {PlayerHue}
 */
export function playerHue(index) {
  return PLAYER_HUES[index % PLAYER_HUES.length];
}

/**
 * P1 Ember brows, P2 Lilac brows — same face, distinct accent.
 *
 * @param {PlayerHue} hue
 */
export function playerAccent(hue) {
  return hue === "sky" ? FACET.lilac : FACET.ember;
}

/**
 * Faceted skull. Local units around the nose. +y is down.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {SkeletonMood} [mood]
 * @returns {Face[]}
 */
export function headFaces(body, mood = "idle") {
  const lift = mood === "win" ? -1.2 : mood === "fail" ? 0.6 : 0;
  const squash = mood === "effort" ? 0.86 : mood === "fail" ? 0.94 : 1;
  const map = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x, y * squash + lift]));
  return [
    { pts: map([[0, -13], [-9, -4], [2, -3]]), fill: body.lit },
    { pts: map([[0, -13], [9, -4], [2, -3]]), fill: body.mid },
    { pts: map([[-9, -4], [-8, 8], [0, 1]]), fill: body.mid },
    { pts: map([[9, -4], [8, 8], [0, 1]]), fill: body.shade },
    { pts: map([[-8, 8], [0, 14], [8, 8]]), fill: body.shade },
    { pts: map([[-4, -2], [3, -5], [1, 3]]), fill: body.lit },
  ];
}

/**
 * Eyes, brows, mouth. Local units around the nose.
 *
 * @param {SkeletonMood} mood
 * @param {string} accent
 * @returns {Face[]}
 */
export function faceFaces(mood, accent) {
  const fail = mood === "fail";
  const win = mood === "win";
  const effort = mood === "effort";
  const white = FACET.bone;
  const pupil = FACET.ink;
  const brow = fail ? FACET.coral : accent;
  const lip = fail ? FACET.coral : win ? FACET.bone : effort ? FACET.ink : FACET.bone;

  const eyeY = win ? -6.2 : fail ? -5 : effort ? -5.4 : -5.6;
  const eyeW = effort ? 5.6 : win ? 4.8 : 4.4;
  const eyeH = effort ? 2.4 : fail ? 3.4 : win ? 4.8 : 4;
  const pupilY = win ? -1.2 : fail ? 0.9 : 0.2;
  const spread = 6.4;

  const browY = win ? eyeY - 4.4 : effort ? eyeY - 2.6 : fail ? eyeY - 2.8 : eyeY - 3.4;
  const browTilt = win ? -1.2 : fail ? 1.6 : effort ? 1.8 : 0.2;
  const mouthY = win ? 7.4 : fail ? 8 : effort ? 7 : 6.8;

  /** @param {number} side */
  const eye = (side) => {
    const cx = side * spread;
    return [
      { pts: [[cx, eyeY - eyeH], [cx + eyeW, eyeY], [cx, eyeY + eyeH]], fill: white },
      { pts: [[cx, eyeY - eyeH], [cx, eyeY + eyeH], [cx - eyeW, eyeY]], fill: white },
      { pts: [[cx - 1.4, eyeY + pupilY], [cx + 1.4, eyeY + pupilY], [cx, eyeY + pupilY + 2.2]], fill: pupil },
    ];
  };

  /** @param {number} side */
  const browFace = (side) => {
    const inner = side * (spread - 2.4);
    const outer = side * (spread + 3.2);
    return {
      pts: [
        [inner, browY + browTilt],
        [outer, browY - browTilt * 0.35],
        [side * spread, browY + 1.2],
      ],
      fill: brow,
    };
  };

  /** @type {Face[]} */
  const mouth = win
    ? [
        { pts: [[-6.2, mouthY], [0, mouthY + 3.8], [-0.8, mouthY + 1.2]], fill: lip },
        { pts: [[6.2, mouthY], [0, mouthY + 3.8], [0.8, mouthY + 1.2]], fill: lip },
      ]
    : fail
      ? [
          { pts: [[-5.6, mouthY + 2.2], [0, mouthY - 1.4], [-0.8, mouthY + 1]], fill: lip },
          { pts: [[5.6, mouthY + 2.2], [0, mouthY - 1.4], [0.8, mouthY + 1]], fill: lip },
        ]
      : effort
        ? [
            { pts: [[-4.2, mouthY - 0.6], [4.2, mouthY - 0.2], [0, mouthY + 0.5]], fill: lip },
            { pts: [[-4.2, mouthY + 1.4], [4.2, mouthY + 1], [0, mouthY + 0.3]], fill: FACET.bone },
          ]
        : [{ pts: [[-2.8, mouthY], [2.8, mouthY + 0.3], [0, mouthY + 1.8]], fill: lip }];

  return [...eye(-1), ...eye(1), browFace(-1), browFace(1), ...mouth];
}

/**
 * Torso panels. Pixel space. Upper-left panel is lit.
 *
 * @param {Pt} ls
 * @param {Pt} rs
 * @param {Pt} lh
 * @param {Pt} rh
 * @param {ReturnType<typeof facetShade>} body
 * @returns {Face[]}
 */
export function torsoFaces(ls, rs, lh, rh, body) {
  const midShoulder = mid(ls, rs);
  const midHip = mid(lh, rh);
  const core = mid(midShoulder, midHip);
  return [
    { pts: [ls, midShoulder, core], fill: body.lit },
    { pts: [midShoulder, rs, core], fill: body.mid },
    { pts: [ls, core, lh], fill: body.mid },
    { pts: [rs, rh, core], fill: body.shade },
    { pts: [lh, core, midHip], fill: body.shade },
    { pts: [midHip, rh, core], fill: body.shade },
  ];
}

/**
 * Two triangles along a bone. Distal `rb` should stay small at strikers.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} ra
 * @param {number} rb
 * @param {ReturnType<typeof facetShade>} body
 * @returns {Face[]}
 */
export function limbFaces(ax, ay, bx, by, ra, rb, body) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 2) return [];
  const nx = -dy / len;
  const ny = dx / len;
  /** @type {Pt} */
  const a0 = [ax + nx * ra, ay + ny * ra];
  /** @type {Pt} */
  const a1 = [ax - nx * ra, ay - ny * ra];
  /** @type {Pt} */
  const b0 = [bx + nx * rb, by + ny * rb];
  /** @type {Pt} */
  const b1 = [bx - nx * rb, by - ny * rb];
  const t0 = [a0, b0, b1];
  const t1 = [a0, b1, a1];
  const litFirst = lightKey(centroid(t0)) <= lightKey(centroid(t1));
  return [
    { pts: t0, fill: litFirst ? body.lit : body.shade },
    { pts: t1, fill: litFirst ? body.shade : body.mid },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Record<string, Joint> | undefined | null} joints
 * @param {{
 *   playerIndex?: number,
 *   label?: string,
 *   footGame?: boolean,
 *   mood?: SkeletonMood,
 *   simple?: boolean,
 * }} [look]
 */
export function drawSkeleton(
  ctx,
  width,
  height,
  joints,
  { playerIndex = 0, label = "", footGame = false, mood = "idle", simple = false } = {},
) {
  if (!joints) return;

  const hue = playerHue(playerIndex);
  const body = facetShade(hue);
  const rgb = PLAYER_RGB[playerIndex % PLAYER_RGB.length];
  const accent = playerAccent(hue);
  const px = (name) => pixel(joints[name], width, height);
  const span = shoulderSpan(joints, width, height);
  const thick = clamp(span * (simple ? 0.18 : 0.22), simple ? 6 : 8, simple ? 16 : 22);
  const headScale = clamp(span / (simple ? 24 : 20), simple ? 1.45 : 1.8, simple ? 2.8 : 3.6);
  const distal = Math.max(2, thick * 0.14);

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;

  /** @type {Face[]} */
  const skin = [];

  const ls = px("left_shoulder");
  const rs = px("right_shoulder");
  const lh = px("left_hip");
  const rh = px("right_hip");
  if (ls && rs && lh && rh) {
    skin.push(...torsoFaces(ls, rs, lh, rh, body));
  }

  for (const [from, to] of LIMB_BONES) {
    const a = px(from);
    const b = px(to);
    if (!a || !b) continue;
    const strikeTo = isStrikerJoint(to, footGame);
    const ra = limbRadius(from, thick);
    const rb = strikeTo ? distal : limbRadius(to, thick);
    const tip = strikeTo ? shorten(a[0], a[1], b[0], b[1], STRIKER_HALO * 0.9) : b;
    skin.push(...limbFaces(a[0], a[1], tip[0], tip[1], ra, rb, body));
  }

  const nose = px("nose");
  if (nose && ls && rs) {
    const midShoulder = mid(ls, rs);
    const chin = /** @type {Pt} */ ([nose[0], nose[1] + headScale * 12]);
    const neckW = headScale * 5.2;
    skin.push(
      { pts: [chin, [midShoulder[0] - neckW, midShoulder[1]], midShoulder], fill: body.mid },
      { pts: [chin, midShoulder, [midShoulder[0] + neckW, midShoulder[1]]], fill: body.shade },
    );
  }

  drawPixelFaces(ctx, skin);

  if (nose) {
    drawFaces(ctx, nose[0], nose[1], headScale, headFaces(body, mood));
    drawFaces(ctx, nose[0], nose[1], headScale, faceFaces(mood, accent));
  }

  ctx.globalAlpha = 1;

  for (const [name, joint] of Object.entries(joints)) {
    if (name === "pointer" || FACE_JOINTS.has(name) || !usable(joint)) continue;
    if (!isStrikerJoint(name, footGame)) continue;
    const x = joint.x * width;
    const y = joint.y * height;
    fillDiamond(ctx, x, y, STRIKER_HALO, FACET.bone);
    fillDiamond(ctx, x, y, STRIKER_RADIUS, `rgb(${rgb})`);
    fillDiamond(ctx, x, y, 2.4, FACET.ink);
  }

  const tag = usable(joints.nose)
    ? joints.nose
    : Object.values(joints).find((joint) => usable(joint));
  if (label && tag) {
    const lift = nose ? headScale * 16 : 12;
    ctx.font = '700 14px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fillText(label.toUpperCase(), tag.x * width, tag.y * height - lift);
  }

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Face[]} faces
 */
function drawPixelFaces(ctx, faces) {
  for (const face of faces) {
    const pts = face.pts;
    if (!pts.length) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
  }
}

/**
 * @param {string} name
 * @param {number} thick
 */
function limbRadius(name, thick) {
  if (name.endsWith("shoulder") || name.endsWith("hip")) return thick;
  if (name.endsWith("elbow") || name.endsWith("knee")) return thick * 0.68;
  return thick * 0.42;
}

/**
 * Pull a distal joint back so the striker diamond sits in the open.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} pad
 * @returns {Pt}
 */
function shorten(ax, ay, bx, by, pad) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.max(0.15, (len - pad) / len);
  return [ax + dx * t, ay + dy * t];
}

/**
 * @param {string} name
 * @param {boolean} footGame
 */
function isStrikerJoint(name, footGame) {
  return name.endsWith("wrist") || (footGame && name.endsWith("ankle"));
}

/**
 * @param {Record<string, Joint>} joints
 * @param {number} width
 * @param {number} height
 */
function shoulderSpan(joints, width, height) {
  const ls = joints.left_shoulder;
  const rs = joints.right_shoulder;
  if (usable(ls) && usable(rs)) {
    return Math.hypot((rs.x - ls.x) * width, (rs.y - ls.y) * height);
  }
  return Math.min(width, height) * 0.08;
}

/**
 * @param {Joint | undefined} joint
 * @param {number} width
 * @param {number} height
 * @returns {Pt | null}
 */
function pixel(joint, width, height) {
  if (!usable(joint)) return null;
  return [joint.x * width, joint.y * height];
}

/**
 * @param {Pt} a
 * @param {Pt} b
 * @returns {Pt}
 */
function mid(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * @param {Pt[]} pts
 * @returns {Pt}
 */
function centroid(pts) {
  return [
    (pts[0][0] + pts[1][0] + pts[2][0]) / 3,
    (pts[0][1] + pts[1][1] + pts[2][1]) / 3,
  ];
}

/**
 * @param {Pt} pt
 */
function lightKey(pt) {
  return pt[0] + pt[1];
}

/**
 * @param {number} value
 * @param {number} lo
 * @param {number} hi
 */
function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * @param {Joint | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
