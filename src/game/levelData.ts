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

export interface LevelDefinition {
  id: string;
  name: string;
  subtitle: string;
  groundTop: string;
  groundBottom: string;
  background: {
    skyTop: string;
    skyMiddle: string;
    skyBottom: string;
    farHills: string;
    nearHills: string;
    flowerHue: number;
  };
  groundPolylines: Point[][];
  platforms: Rect[];
  hazards: Rect[];
  magnetSegments: MagnetSegment[];
  collectibles: Collectible[];
  hiddenCollectibles: Collectible[];
  checkpoints: Checkpoint[];
  finish: Rect;
  startPosition: Point;
  worldMinX: number;
  worldMaxX: number;
  deathY: number;
  landmarks: { x: number; y: number; label: string }[];
}

const BASELINE = 560;

function flat(x1: number, x2: number, y: number, step = 100): Point[] {
  const pts: Point[] = [];
  for (let x = x1; x <= x2; x += step) pts.push({ x, y });
  if (pts.length && pts[pts.length - 1].x !== x2) pts.push({ x: x2, y });
  return pts;
}

function bumps(x1: number, x2: number, baseY: number, amp: number, period: number, step = 40): Point[] {
  const pts: Point[] = [];
  for (let x = x1; x <= x2; x += step) {
    const y = baseY - Math.sin(((x - x1) / period) * Math.PI * 2) * amp;
    pts.push({ x, y });
  }
  if (pts.length && pts[pts.length - 1].x !== x2) {
    const y = baseY - Math.sin(((x2 - x1) / period) * Math.PI * 2) * amp;
    pts.push({ x: x2, y });
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

const gardenGround: Point[][] = [
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

const gardenPlatforms: Rect[] = [
  { x: 2560, y: 430, w: 140, h: 22 }, // upper collectible-route platform 1
  { x: 2800, y: 380, w: 140, h: 22 }, // upper collectible-route platform 2
  { x: 3040, y: 430, w: 140, h: 22 }, // upper collectible-route platform 3

  // Stepping stones across spike pit (3080 - 3420)
  { x: 3140, y: 500, w: 90, h: 20 },
  { x: 3300, y: 460, w: 90, h: 20 },
];

const gardenHazards: Rect[] = [
  { x: 3080, y: 640, w: 360, h: 40 }, // spike pit under stepping stones
  { x: 4150, y: 640, w: 800, h: 40 }, // deep chasm floor under glide section
];

const gardenMagnets: MagnetSegment[] = [
  { id: "mwall_up", x1: 5500, y1: 480, x2: 5500, y2: 230 },
  { id: "mceil", x1: 5500, y1: 230, x2: 5820, y2: 230 },
  { id: "mwall_down", x1: 5820, y1: 230, x2: 5820, y2: 480 },
  { id: "mwall_secret", x1: 5500, y1: 230, x2: 5500, y2: 90 },
];

const gardenCollectibles: Collectible[] = [
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

const gardenHidden: Collectible[] = [
  { id: "hidden1", x: 5500, y: 70 }, // atop the secret magnet branch
];

const gardenCheckpoints: Checkpoint[] = [
  { id: "cp0", x: -40, y: BASELINE - 60 },
  { id: "cp1", x: 2420, y: BASELINE - 60 },
  { id: "cp2", x: 3460, y: BASELINE - 60 },
  { id: "cp3", x: 5180, y: BASELINE - 60 },
];

const garden: LevelDefinition = {
  id: "mechanical-garden",
  name: "The Mechanical Garden",
  subtitle: "Build speed, jump the gaps, and glide through the garden.",
  groundTop: "#5fbf5f",
  groundBottom: "#4a3220",
  background: {
    skyTop: "#bdeaff", skyMiddle: "#d8f3ff", skyBottom: "#eafff1",
    farHills: "#bfe9c9", nearHills: "#a7e0b6", flowerHue: 330,
  },
  groundPolylines: gardenGround,
  platforms: gardenPlatforms,
  hazards: gardenHazards,
  magnetSegments: gardenMagnets,
  collectibles: gardenCollectibles,
  hiddenCollectibles: gardenHidden,
  checkpoints: gardenCheckpoints,
  finish: { x: 6820, y: BASELINE - 120, w: 70, h: 220 },
  startPosition: { x: -40, y: BASELINE - 80 },
  worldMinX: -300,
  worldMaxX: 7000,
  deathY: 1000,
  landmarks: [
    { x: 1650, y: BASELINE, label: "jump" },
    { x: 3850, y: BASELINE, label: "glide" },
    { x: 5450, y: BASELINE, label: "magnet" },
    { x: 6750, y: BASELINE, label: "finish" },
  ],
};

const hollowGround: Point[][] = [
  [...flat(-200, 520, BASELINE), ...bumps(520, 1250, BASELINE, 30, 300), ...ramp(1250, BASELINE, 1480, BASELINE - 130)],
  [...ramp(1740, BASELINE - 130, 1960, BASELINE), ...flat(1960, 2580, BASELINE)],
  [...flat(2980, 3500, BASELINE), ...ramp(3500, BASELINE, 3700, BASELINE - 140)],
  [...ramp(4270, BASELINE - 140, 4480, BASELINE), ...flat(4480, 5550, BASELINE)],
];
const hollow: LevelDefinition = {
  id: "mushroom-hollow",
  name: "Mushroom Hollow",
  subtitle: "Bounce between mushroom caps and ride the wind over the hollow.",
  groundTop: "#db7eaa",
  groundBottom: "#56304f",
  background: {
    skyTop: "#f7cce2", skyMiddle: "#fbe4f1", skyBottom: "#fff1dd",
    farHills: "#e9b5c9", nearHills: "#c58caa", flowerHue: 285,
  },
  groundPolylines: hollowGround,
  platforms: [
    { x: 2520, y: 430, w: 130, h: 20 },
    { x: 2720, y: 365, w: 130, h: 20 },
    { x: 2920, y: 430, w: 130, h: 20 },
  ],
  hazards: [
    { x: 2580, y: 640, w: 400, h: 40 },
    { x: 3700, y: 640, w: 570, h: 40 },
  ],
  magnetSegments: [
    { id: "hollow-wall", x1: 4820, y1: 470, x2: 4820, y2: 240 },
    { id: "hollow-ceiling", x1: 4820, y1: 240, x2: 5110, y2: 240 },
    { id: "hollow-drop", x1: 5110, y1: 240, x2: 5110, y2: 470 },
  ],
  collectibles: [
    { id: "h1", x: 280, y: 500 }, { id: "h2", x: 750, y: 450 }, { id: "h3", x: 1110, y: 480 },
    { id: "h4", x: 1610, y: 300 }, { id: "h5", x: 2140, y: 500 }, { id: "h6", x: 2560, y: 390 },
    { id: "h7", x: 2760, y: 325 }, { id: "h8", x: 2960, y: 390 }, { id: "h9", x: 3250, y: 500 },
    { id: "h10", x: 3850, y: 350 }, { id: "h11", x: 4100, y: 300 }, { id: "h12", x: 4380, y: 380 },
    { id: "h13", x: 4630, y: 500 }, { id: "h14", x: 4930, y: 200 }, { id: "h15", x: 5250, y: 480 },
  ],
  hiddenCollectibles: [{ id: "hollow-hidden", x: 5110, y: 190 }],
  checkpoints: [
    { id: "hollow-cp0", x: -40, y: 500 },
    { id: "hollow-cp1", x: 2040, y: 500 },
    { id: "hollow-cp2", x: 3050, y: 500 },
    { id: "hollow-cp3", x: 4510, y: 500 },
  ],
  finish: { x: 5440, y: 440, w: 70, h: 220 },
  startPosition: { x: -40, y: 480 },
  worldMinX: -300,
  worldMaxX: 5650,
  deathY: 1000,
  landmarks: [
    { x: 1420, y: BASELINE, label: "jump" },
    { x: 3580, y: BASELINE, label: "glide" },
    { x: 4780, y: BASELINE, label: "magnet" },
    { x: 5380, y: BASELINE, label: "finish" },
  ],
};

const canopyGround: Point[][] = [
  [...flat(-200, 650, BASELINE), ...ramp(650, BASELINE, 930, BASELINE - 170)],
  [...ramp(1230, BASELINE - 170, 1510, BASELINE), ...flat(1510, 2200, BASELINE)],
  [...flat(2600, 3120, BASELINE), ...ramp(3120, BASELINE, 3400, BASELINE - 160)],
  [...ramp(4000, BASELINE - 160, 4280, BASELINE), ...flat(4280, 5100, BASELINE)],
];
const canopy: LevelDefinition = {
  id: "clockwork-canopy",
  name: "Clockwork Canopy",
  subtitle: "A high-speed treetop run with long glides and magnetic shortcuts.",
  groundTop: "#77b8cf",
  groundBottom: "#28465b",
  background: {
    skyTop: "#a9d5eb", skyMiddle: "#d1e7ef", skyBottom: "#e5f3ed",
    farHills: "#a6d2ca", nearHills: "#78aaa9", flowerHue: 190,
  },
  groundPolylines: canopyGround,
  platforms: [
    { x: 2150, y: 450, w: 130, h: 20 },
    { x: 2370, y: 390, w: 130, h: 20 },
    { x: 2570, y: 450, w: 130, h: 20 },
  ],
  hazards: [
    { x: 2200, y: 640, w: 400, h: 40 },
    { x: 3400, y: 640, w: 600, h: 40 },
  ],
  magnetSegments: [
    { id: "canopy-rise", x1: 4510, y1: 470, x2: 4510, y2: 220 },
    { id: "canopy-bridge", x1: 4510, y1: 220, x2: 4800, y2: 220 },
    { id: "canopy-fall", x1: 4800, y1: 220, x2: 4800, y2: 470 },
  ],
  collectibles: [
    { id: "c1", x: 250, y: 490 }, { id: "c2", x: 700, y: 430 }, { id: "c3", x: 1050, y: 300 },
    { id: "c4", x: 1320, y: 300 }, { id: "c5", x: 1800, y: 500 }, { id: "c6", x: 2200, y: 410 },
    { id: "c7", x: 2420, y: 350 }, { id: "c8", x: 2640, y: 410 }, { id: "c9", x: 2880, y: 500 },
    { id: "c10", x: 3500, y: 360 }, { id: "c11", x: 3740, y: 300 }, { id: "c12", x: 3970, y: 360 },
    { id: "c13", x: 4380, y: 500 }, { id: "c14", x: 4650, y: 180 }, { id: "c15", x: 4930, y: 480 },
  ],
  hiddenCollectibles: [{ id: "canopy-hidden", x: 4510, y: 170 }],
  checkpoints: [
    { id: "canopy-cp0", x: -40, y: 500 },
    { id: "canopy-cp1", x: 1600, y: 500 },
    { id: "canopy-cp2", x: 2680, y: 500 },
    { id: "canopy-cp3", x: 4310, y: 500 },
  ],
  finish: { x: 5010, y: 440, w: 70, h: 220 },
  startPosition: { x: -40, y: 480 },
  worldMinX: -300,
  worldMaxX: 5220,
  deathY: 1000,
  landmarks: [
    { x: 900, y: BASELINE, label: "jump" },
    { x: 3100, y: BASELINE, label: "glide" },
    { x: 4470, y: BASELINE, label: "magnet" },
    { x: 4950, y: BASELINE, label: "finish" },
  ],
};

export const LEVELS: LevelDefinition[] = [garden, hollow, canopy];
export const FIRST_LEVEL_ID = garden.id;

export function getLevelById(id: string): LevelDefinition {
  return LEVELS.find((level) => level.id === id) ?? garden;
}

export function getNextLevel(levelId: string): LevelDefinition | null {
  const index = LEVELS.findIndex((level) => level.id === levelId);
  return index >= 0 ? LEVELS[index + 1] ?? null : null;
}
