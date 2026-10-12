// Procedurally rendered parallax background for the Mechanical Garden.
// Deterministic pseudo-random placement keyed off world position so the
// scenery never jitters or reshuffles between frames.

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camX: number,
  camY: number,
  timeSec: number
) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#bdeaff");
  sky.addColorStop(0.55, "#d8f3ff");
  sky.addColorStop(1, "#eafff1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sun glow
  ctx.save();
  const sunX = width * 0.82;
  const sunY = height * 0.18;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 220);
  glow.addColorStop(0, "#fff7d6");
  glow.addColorStop(1, "#fff7d600");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  drawCloudLayer(ctx, width, camX * 0.05, 90, 0.00022, 50, 10);
  drawCloudLayer(ctx, width, camX * 0.09, 160, 0.00028, 60, 16);
  drawFarGears(ctx, width, height, camX * 0.18, camY * 0.1, timeSec);
  drawGiantFlowers(ctx, width, height, camX * 0.35, camY * 0.2, timeSec);
  drawHillSilhouette(ctx, width, height, camX * 0.55, camY * 0.3, "#bfe9c9");
  drawHillSilhouette(ctx, width, height, camX * 0.72, camY * 0.4, "#a7e0b6");
}

function drawCloudLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  offsetX: number,
  baseY: number,
  density: number,
  size: number,
  heightBand: number
) {
  ctx.save();
  ctx.fillStyle = "#ffffffcc";
  const spacing = 1 / density;
  const start = Math.floor((offsetX - width) / spacing) - 1;
  const end = Math.floor((offsetX + width * 2) / spacing) + 1;
  for (let i = start; i <= end; i++) {
    const seed = hash(i * 13.37);
    const x = i * spacing - offsetX;
    const y = baseY + (seed - 0.5) * heightBand * 2;
    const s = size * (0.6 + seed * 0.8);
    if (x < -s * 3 || x > width + s * 3) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.6, y + s * 0.1, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(x - s * 0.6, y + s * 0.15, s * 0.55, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFarGears(ctx: CanvasRenderingContext2D, width: number, height: number, offsetX: number, offsetY: number, t: number) {
  const spacing = 520;
  const start = Math.floor((offsetX - width) / spacing) - 1;
  const end = Math.floor((offsetX + width * 2) / spacing) + 1;
  for (let i = start; i <= end; i++) {
    const seed = hash(i * 7.77);
    const x = i * spacing - offsetX + seed * 120;
    const y = height * 0.42 + seed * 70 - offsetY;
    const r = 60 + seed * 50;
    drawGear(ctx, x, y, r, 10, "#d7c7a8aa", t * (0.1 + seed * 0.1) * (i % 2 === 0 ? 1 : -1));
  }
}

function drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, color: string, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * r * 1.18, Math.sin(a2) * r * 1.18);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#eef0f500";
  ctx.globalCompositeOperation = "destination-out";
  ctx.fill();
  ctx.restore();
}

function drawGiantFlowers(ctx: CanvasRenderingContext2D, width: number, height: number, offsetX: number, offsetY: number, t: number) {
  const spacing = 380;
  const start = Math.floor((offsetX - width) / spacing) - 1;
  const end = Math.floor((offsetX + width * 2) / spacing) + 1;
  for (let i = start; i <= end; i++) {
    const seed = hash(i * 3.14);
    if (seed < 0.35) continue;
    const x = i * spacing - offsetX + seed * 140;
    const groundY = height * 0.62 - offsetY;
    const stemH = 90 + seed * 90;
    const sway = Math.sin(t * 0.6 + i) * 4;
    const hue = 330 + seed * 40;
    ctx.save();
    ctx.strokeStyle = "#6fae6f";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x + sway, groundY - stemH * 0.5, x + sway * 1.4, groundY - stemH);
    ctx.stroke();
    ctx.translate(x + sway * 1.4, groundY - stemH);
    ctx.fillStyle = `hsl(${hue} 70% 80% / 0.85)`;
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -26, 16, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHillSilhouette(ctx: CanvasRenderingContext2D, width: number, height: number, offsetX: number, offsetY: number, color: string) {
  const spacing = 300;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  const start = Math.floor((offsetX - width) / spacing) - 2;
  const end = Math.floor((offsetX + width * 2) / spacing) + 2;
  for (let i = start; i <= end; i++) {
    const seed = hash(i * 9.1);
    const x = i * spacing - offsetX;
    const y = height * 0.72 - seed * 60 - offsetY;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width + spacing, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
