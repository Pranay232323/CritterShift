export type MovementForm = "roll" | "glide" | "magnet";

export type GameStatus =
  | "title"
  | "playing"
  | "paused"
  | "complete"
  | "customize"
  | "dead";

export interface ColorScheme {
  id: string;
  name: string;
  cost: number;
  primary: string;
  secondary: string;
  accent: string;
}

export interface SaveData {
  bestTimeMs: number | null;
  bestEnergy: number;
  totalEnergyBanked: number;
  hiddenFound: string[];
  unlockedColors: string[];
  selectedColor: string;
  levelCompletedOnce: boolean;
  unlockedLevelIds: string[];
  selectedLevelId: string;
  bestTimes: Record<string, number>;
  muted: boolean;
}

export interface HudSnapshot {
  form: MovementForm;
  energy: number;
  totalEnergyInLevel: number;
  hiddenFound: number;
  totalHidden: number;
  elapsedMs: number;
  speedKph: number;
  progress: number;
  grounded: boolean;
  nearMagnetSurface: boolean;
  canGlide: boolean;
  message: string | null;
}
