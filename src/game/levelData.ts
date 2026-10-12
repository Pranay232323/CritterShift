// CRITTERSHIFT: WILDWHEEL WORLDS
// Level 1 — "The Mechanical Garden"
// All coordinates are world-space pixels. +x = right, +y = down.

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
}

export interface MagnetSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  id: string;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
}

const BASELINE = 560;

function flat(x1: number, x2: number, y: number, step = 100): Point[] {
  const pts: Point[] = [];
  for (let x = x1; x <= x2; x += step) pts.push({ x, y });
  return pts;
}

function bumps(x1: number, x2: number, baseY: number, amp: number, period: number, step = 40): Point[] {
  const pts: Point[] = [];
  for (let x = x1; x <= x2; x += step) {
    const y = baseY - Math.sin(((x - x1) / period) * Math.PI * 2) * amp;
    pts.push({ x, y });
  }
  return pts;
}

function ramp(x1: number, y1: number, x2: number, y2: number, step = 30): Point[] {
  const pts: Point[] = [];
  const n = Math.max(2, Math.round(Math.abs(x2 - x1) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

// ---------- GROUND (chains separated by gaps = chasms / pits) ----------
export const groundPolylines: Point[][] = [
  // 1. Safe intro + bumps, flowing directly into the launch ramp for gap-jump #1
  [
    ...flat(-200, 500, BASELINE),
    ...bumps(500, 1500, BASELINE, 22, 260),
    ...ramp(1500, BASELINE, 1750, BASELINE - 150),
  ],
  // (gap 1750 -> 2050, momentum jump test)
  // 2. Landing ramp, flat collectible-fork ground leading up to the stepping-stone pit
  [...ramp(2050, BASELINE - 150, 2300, BASELINE), ...flat(2300, 3080, BASELINE)],
  // (spike pit 3080 -> 3440, optional stepping-stone platforms cross it)
  // 3. Resumed ground, flat run into the glide-chasm launch ramp
  [...flat(3440, 3900, BASELINE), ...ramp(3900, BASELINE, 4150, BASELINE - 150)],
  // (deep glide chasm 4150 -> 4950, requires GLIDE)
  // 4. Landing ramp + long flat run to the magnet arch, bonus area, and finish
  [...ramp(4950, BASELINE - 150, 5150, BASELINE), ...flat(5150, 6900, BASELINE)],
];

// ---------- STEPPING PLATFORMS (alternate crossing over spike pit) ----------
export const platforms: Rect[] = [
  { x: 2560, y: 430, w: 140, h: 22 }, // upper collectible-route platform 1
  { x: 2800, y: 380, w: 140, h: 22 }, // upper collectible-route platform 2
  { x: 3040, y: 430, w: 140, h: 22 }, // upper collectible-route platform 3

  // Stepping stones across spike pit (3080 - 3420)
  { x: 3140, y: 500, w: 90, h: 20 },
  { x: 3300, y: 460, w: 90, h: 20 },
];

// ---------- HAZARDS (spike pits / danger zones -> respawn at checkpoint) ----------
export const hazards: Rect[] = [
  { x: 3080, y: 640, w: 360, h: 40 }, // spike pit under stepping stones
  { x: 4150, y: 640, w: 800, h: 40 }, // deep chasm floor under glide section
];

// ---------- MAGNETIC SURFACES (optional bonus arch + hidden alcove) ----------
// Note: wall bases stop ~80px above the ground so rolling players can pass
// freely underneath the arch on the normal path - the magnet route is a
// genuinely optional bonus detour, not a mandatory gate.
export const magnetSegments: MagnetSegment[] = [
  { id: "mwall_up", x1: 5500, y1: 480, x2: 5500, y2: 230 },
  { id: "mceil", x1: 5500, y1: 230, x2: 5820, y2: 230 },
  { id: "mwall_down", x1: 5820, y1: 230, x2: 5820, y2: 480 },
  { id: "mwall_secret", x1: 5500, y1: 230, x2: 5500, y2: 90 },
];

// ---------- COLLECTIBLES (energy orbs) ----------
export const collectibles: Collectible[] = [
  { id: "e1", x: 300, y: BASELINE - 60 },
  { id: "e2", x: 760, y: BASELINE - 90 },
  { id: "e3", x: 1040, y: BASELINE - 90 },
  { id: "e4", x: 1320, y: BASELINE - 90 },
  { id: "e5", x: 2000, y: BASELINE - 230 }, // mid gap, rewards a good jump
  { id: "e6", x: 2600, y: 390 },
  { id: "e7", x: 2840, y: 340 },
  { id: "e8", x: 3080, y: 390 },
  { id: "e9", x: 3160, y: 450 },
  { id: "e10", x: 3320, y: 410 },
  { id: "e11", x: 3650, y: BASELINE - 70 },
  { id: "e12", x: 4300, y: BASELINE - 260 }, // mid glide chasm
  { id: "e13", x: 4600, y: BASELINE - 300 },
  { id: "e14", x: 4850, y: BASELINE - 260 },
  { id: "e15", x: 5300, y: BASELINE - 70 },
  { id: "e16", x: 5660, y: 190 },
  { id: "e17", x: 5950, y: BASELINE - 300 },
  { id: "e18", x: 6200, y: BASELINE - 70 },
  { id: "e19", x: 6450, y: BASELINE - 90 },
  { id: "e20", x: 6620, y: BASELINE - 70 },
];

// ---------- HIDDEN DISCOVERY ----------
export const hiddenCollectibles: Collectible[] = [
  { id: "hidden1", x: 5500, y: 70 }, // atop the secret magnet branch
];

// ---------- CHECKPOINTS ----------
export const checkpoints: Checkpoint[] = [
  { id: "cp0", x: -40, y: BASELINE - 60 },
  { id: "cp1", x: 2420, y: BASELINE - 60 },
  { id: "cp2", x: 3460, y: BASELINE - 60 },
  { id: "cp3", x: 5180, y: BASELINE - 60 },
];

// ---------- FINISH ----------
export const finish = { x: 6820, y: BASELINE - 120, w: 70, h: 220 };

export const startPosition: Point = { x: -40, y: BASELINE - 80 };

export const BASELINE_Y = BASELINE;
export const WORLD_MIN_X = -300;
export const WORLD_MAX_X = 7000;
export const DEATH_Y = 1000;

// Decorative landmark towers (purely visual cues) placed near key gameplay beats
export const landmarks = [
  { x: 1650, y: BASELINE, label: "jump" },
  { x: 3850, y: BASELINE, label: "glide" },
  { x: 5450, y: BASELINE, label: "magnet" },
  { x: 6750, y: BASELINE, label: "finish" },
];
