import type { SaveData } from "./types";

const KEY = "crittershift-save-v1";

const DEFAULT_SAVE: SaveData = {
  bestTimeMs: null,
  bestEnergy: 0,
  totalEnergyBanked: 0,
  hiddenFound: [],
  unlockedColors: ["copper"],
  selectedColor: "copper",
  levelCompletedOnce: false,
  muted: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (e.g. private mode) - fail silently, game stays playable
  }
}
