import {
  checkpoints,
  collectibles,
  finish,
  groundPolylines,
  hazards,
  hiddenCollectibles,
  landmarks,
  platforms,
} from "../levelData";
import type { MagnetSurfaceInfo } from "./terrainBuilder";

export interface LevelRenderOptions {
  collected: Set<string>;
  hiddenFound: Set<string>;
  activeCheckpointId: string | null;
  attachedSurfaceId: string | null;
  nearMagnetIds: Set<string>;
  magnetSurfaces: MagnetSurfaceInfo[];
  timeSec: number;
}

export function renderLevel(
  ctx: CanvasRenderingContext2D,
  toX: (x: number) => number,
  toY: (y: number) => number,
  width: number,
  height: number,
  opts: LevelRenderOptions
) {
  // Ground chains
  for (const chain of groundPolylines) {
    if (chain.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(toX(chain[0].x), toY(chain[0].y));
    for (let i = 1; i < chain.length; i++) ctx.lineTo(toX(chain[i].x), toY(chain[i].y));
    ctx.lineTo(toX(chain[chain.length - 1].x), height + 80);
    ctx.lineTo(toX(chain[0].x), height + 80);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, toY(chain[0].y), 0, height);
    grad.addColorStop(0, "#8a5a3b");
    grad.addColorStop(0.08, "#6e4730");
    grad.addColorStop(1, "#4a3220");
    ctx.fillStyle = grad;
    ctx.fill();

    // grass cap
    ctx.beginPath();
    ctx.moveTo(toX(chain[0].x), toY(chain[0].y));
    for (let i = 1; i < chain.length; i++) ctx.lineTo(toX(chain[i].x), toY(chain[i].y));
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#5fbf5f";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#7fd87f";
    ctx.stroke();
  }

  // Platforms
  for (const p of platforms) {
    const x = toX(p.x);
    const y = toY(p.y);
    ctx.fillStyle = "#b98652";
    ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = "#5fbf5f";
    ctx.fillRect(x, y - 4, p.w, 6);
    ctx.strokeStyle = "#6e4730";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, p.w, p.h);
  }

  // Hazards (spike strip)
  for (const h of hazards) {
    const baseX = toX(h.x);
    const baseY = toY(h.y);
    ctx.fillStyle = "#3a2b22";
    ctx.fillRect(baseX, baseY, h.w, h.h);
    ctx.fillStyle = "#e4594f";
    const spikeW = 22;
    for (let sx = 0; sx < h.w; sx += spikeW) {
      ctx.beginPath();
      ctx.moveTo(baseX + sx, baseY);
      ctx.lineTo(baseX + sx + spikeW / 2, baseY - 20);
      ctx.lineTo(baseX + sx + spikeW, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Magnet surfaces
  for (const surf of opts.magnetSurfaces) {
    const x1 = toX(surf.x1);
    const y1 = toY(surf.y1);
    const x2 = toX(surf.x2);
    const y2 = toY(surf.y2);
    const isActive = opts.attachedSurfaceId === surf.id;
    const isNear = opts.nearMagnetIds.has(surf.id);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = isActive ? "#ff5fae" : isNear ? "#ffa3d4" : "#8d7fe0";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = "#2c2550";
    ctx.lineWidth = 16;
    ctx.setLineDash([2, 14]);
    ctx.stroke();
    ctx.setLineDash([]);

    // animated chevrons indicating magnetic pull
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dirX = (x2 - x1) / (len || 1);
    const dirY = (y2 - y1) / (len || 1);
    const nx = -dirY;
    const ny = dirX;
    const phase = (opts.timeSec * 40) % 28;
    ctx.fillStyle = isActive ? "#ffe3f3" : "#d8d2ff";
    for (let d = phase; d < len; d += 28) {
      const cx = x1 + dirX * d;
      const cy = y1 + dirY * d;
      ctx.beginPath();
      ctx.arc(cx + nx * 10, cy + ny * 10, 2.2, 0, Math.PI * 2);
      ctx.arc(cx - nx * 10, cy - ny * 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Collectibles
  for (const c of collectibles) {
    if (opts.collected.has(c.id)) continue;
    drawOrb(ctx, toX(c.x), toY(c.y), opts.timeSec, "#ffd23f", "#ff9a3f", 13);
  }
  for (const c of hiddenCollectibles) {
    if (opts.hiddenFound.has(c.id)) continue;
    drawOrb(ctx, toX(c.x), toY(c.y), opts.timeSec, "#9ef2ff", "#4fc3ff", 17, true);
  }

  // Checkpoints
  for (const cp of checkpoints) {
    const x = toX(cp.x);
    const y = toY(cp.y + 70);
    const active = opts.activeCheckpointId === cp.id;
    ctx.strokeStyle = "#5a4634";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 140);
    ctx.stroke();
    ctx.fillStyle = active ? "#54e08a" : "#9aa0ad";
    ctx.beginPath();
    ctx.moveTo(x, y - 140);
    ctx.lineTo(x + 38, y - 124);
    ctx.lineTo(x, y - 108);
    ctx.closePath();
    ctx.fill();
    if (active) {
      ctx.strokeStyle = "#2f7d52";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Finish gate
  {
    const x = toX(finish.x);
    const y = toY(finish.y);
    const h = finish.h;
    ctx.save();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x - finish.w / 2, y + h / 2);
    ctx.lineTo(x - finish.w / 2, y - h / 2);
    ctx.lineTo(x + finish.w / 2, y - h / 2);
    ctx.lineTo(x + finish.w / 2, y + h / 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd23f";
    for (let i = 0; i < 5; i++) {
      const fx = x - finish.w / 2 + (i / 4) * finish.w;
      ctx.beginPath();
      ctx.arc(fx, y - h / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#2c2550";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FINISH", x, y - h / 2 - 18);
    ctx.restore();
  }

  // Landmark signposts
  for (const l of landmarks) {
    const x = toX(l.x);
    const y = toY(l.y);
    if (x < -60 || x > width + 60) continue;
    drawSign(ctx, x, y, l.label);
  }
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  colorA: string,
  colorB: string,
  r: number,
  sparkle = false
) {
  const bob = Math.sin(t * 3 + x * 0.01) * 5;
  const yy = y + bob;
  ctx.save();
  const glow = ctx.createRadialGradient(x, yy, 2, x, yy, r * 2.6);
  glow.addColorStop(0, `${colorA}99`);
  glow.addColorStop(1, `${colorA}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, yy, r * 2.6, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, yy - r, x, yy + r);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, yy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffffaa";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffffcc";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, yy - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (sparkle) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r + 6), yy + Math.sin(a) * (r + 6));
      ctx.lineTo(x + Math.cos(a) * (r + 14), yy + Math.sin(a) * (r + 14));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSign(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  ctx.save();
  ctx.strokeStyle = "#6e4730";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 60);
  ctx.stroke();
  ctx.fillStyle = "#fff8e8";
  ctx.strokeStyle = "#6e4730";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 24, y - 92, 48, 34, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2c2550";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyph = label === "jump" ? "⤴" : label === "glide" ? "✦" : label === "magnet" ? "⊛" : "★";
  ctx.fillText(glyph, x, y - 75);
  ctx.restore();
}
