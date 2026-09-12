/**
 * Draws the current game state onto the existing canvas.
 */

/**
 * @typedef {import("../game/index.js").GameState} GameState
 */

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not available.");
  }

  let width = 0;
  let height = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /**
   * @param {GameState} state
   */
  function draw(state) {
    ctx.clearRect(0, 0, width, height);

    const x = state.marker.x * width;
    const y = state.marker.y * height;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 4);

    ctx.beginPath();
    ctx.arc(x, y, 28 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 154, ${0.18 + pulse * 0.22})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(61, 255, 154, 0.95)";
    ctx.shadowColor = "rgba(61, 255, 154, 0.55)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#052015";
    ctx.fill();
  }

  return { resize, draw };
}
