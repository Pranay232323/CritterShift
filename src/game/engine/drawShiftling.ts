import type { ColorScheme, MovementForm } from "../types";

export interface ShiftlingDrawState {
  form: MovementForm;
  angle: number;
  facing: 1 | -1;
  squash: number;
  wingT: number;
  magnetGlow: number;
  eyeBlink: boolean;
  transformFlash: number;
  grounded: boolean;
  airTime: number;
  timeSec: number;
  celebrating: boolean;
}

interface WheelDraw {
  x: number;
  y: number;
  angle: number;
}

function roundedRect(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
}

function drawWheel(ctx: CanvasRenderingContext2D, w: WheelDraw, colors: ColorScheme, radius: number) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.angle);
  ctx.fillStyle = "#2b2b36";
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1a22";
  ctx.lineWidth = Math.max(2, radius * 0.18);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.15, Math.sin(a) * radius * 0.15);
    ctx.lineTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#44465a";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawShiftling(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: ColorScheme,
  state: ShiftlingDrawState,
  wheelBack: WheelDraw | null,
  wheelFront: WheelDraw | null
) {
  // wheels drawn first (behind body) when present
  if (wheelBack) drawWheel(ctx, wheelBack, colors, 15);
  if (wheelFront) drawWheel(ctx, wheelFront, colors, 15);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.angle);
  ctx.scale(state.facing, 1);

  const squashX = 1 + state.squash * 0.22;
  const squashY = 1 - state.squash * 0.22;
  ctx.scale(squashX, squashY);

  // magnet glow aura
  if (state.magnetGlow > 0.02) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 56);
    g.addColorStop(0, `${colors.accent}66`);
    g.addColorStop(1, `${colors.accent}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 56 * state.magnetGlow, 0, Math.PI * 2);
    ctx.fill();
  }

  // wings (glide form)
  if (state.wingT > 0.02) {
    const flap = Math.sin(state.timeSec * 10) * 6 * state.wingT;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-6, 2);
      ctx.rotate(side * (0.15 + state.wingT * 0.55) + (side * flap * Math.PI) / 180);
      ctx.fillStyle = side < 0 ? shade(colors.secondary, -10) : shade(colors.secondary, 10);
      ctx.beginPath();
      const span = 34 * state.wingT;
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * span * 0.5, -span * 0.9, side * span * 1.1, -span * 0.2);
      ctx.quadraticCurveTo(side * span * 0.7, span * 0.25, 0, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(colors.secondary, -30);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // body pod
  ctx.fillStyle = colors.primary;
  roundedRect(ctx, 58, 30, 14);
  ctx.fill();
  ctx.strokeStyle = shade(colors.primary, -25);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // belly stripe
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  roundedRectPath(ctx, -26, 6, 52, 12, 6);
  ctx.fill();

  // antenna
  ctx.strokeStyle = shade(colors.primary, -20);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -14);
  ctx.lineTo(16, -26);
  ctx.stroke();
  ctx.fillStyle = state.magnetGlow > 0.3 ? colors.accent : "#ffd866";
  ctx.beginPath();
  ctx.arc(16, -27, 4, 0, Math.PI * 2);
  ctx.fill();

  // face plate
  ctx.fillStyle = "#eef6ff";
  ctx.beginPath();
  ctx.ellipse(14, -2, 15, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(colors.primary, -25);
  ctx.lineWidth = 2;
  ctx.stroke();

  // eye
  const blinkScale = state.eyeBlink ? 0.12 : 1;
  ctx.save();
  ctx.translate(16, -3);
  ctx.scale(1, blinkScale);
  ctx.fillStyle = "#17202b";
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  if (!state.eyeBlink) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-2.4, -2.4, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // mouth
  ctx.strokeStyle = shade(colors.primary, -35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (state.celebrating) {
    ctx.arc(14, 6, 5, 0, Math.PI);
  } else if (!state.grounded && state.airTime > 0.15) {
    ctx.ellipse(14, 6, 3, 4, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(14, 3, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();

  // magnet feet pads (visible in magnet form)
  if (state.magnetGlow > 0.2) {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(-16, 16, 5, 0, Math.PI * 2);
    ctx.arc(10, 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (state.transformFlash > 0.02) {
    ctx.save();
    ctx.globalAlpha = state.transformFlash * 0.6;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 70);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#ffffff00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
