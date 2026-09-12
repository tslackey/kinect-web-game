const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");
const pulseBtn = document.getElementById("pulse-btn");

const ctx = canvas.getContext("2d");
const points = [];
const POINT_COUNT = 48;
let width = 0;
let height = 0;
let pulse = 0;
let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resize() {
  const ratio = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function seedPoints() {
  points.length = 0;
  for (let i = 0; i < POINT_COUNT; i += 1) {
    points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 2.2,
    });
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, width, height);

  if (pulse > 0) {
    const originX = width * 0.35;
    const originY = height * 0.42;
    const maxRadius = Math.max(width, height) * 0.7;
    const radius = (1 - pulse) * maxRadius;
    ctx.beginPath();
    ctx.arc(originX, originY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 154, ${0.15 + pulse * 0.7})`;
    ctx.lineWidth = 3 + pulse * 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(originX, originY, Math.max(0, radius - 28), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(110, 230, 255, ${pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    pulse = Math.max(0, pulse - 0.016);
  }

  for (const point of points) {
    if (!reduceMotion) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < 0 || point.x > width) point.vx *= -1;
      if (point.y < 0 || point.y > height) point.vy *= -1;
    }

    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(61, 255, 154, 0.7)";
    ctx.fill();
  }

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(155, 181, 168, ${0.22 * (1 - dist / 140)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  if (!reduceMotion) {
    requestAnimationFrame(drawFrame);
  }
}

function triggerPulse() {
  pulse = 1;
  statusEl.textContent = "Field pulsed.";
  window.setTimeout(() => {
    statusEl.textContent = "Ready.";
  }, 1400);
}

pulseBtn.addEventListener("click", triggerPulse);

window.addEventListener("resize", () => {
  resize();
  seedPoints();
  if (reduceMotion) drawFrame();
});

window
  .matchMedia("(prefers-reduced-motion: reduce)")
  .addEventListener("change", (event) => {
    reduceMotion = event.matches;
    if (!reduceMotion) requestAnimationFrame(drawFrame);
  });

resize();
seedPoints();
drawFrame();
