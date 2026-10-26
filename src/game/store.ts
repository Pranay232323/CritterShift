import { create } from "zustand";
import type { GameStatus, HudSnapshot, SaveData } from "./types";
import { loadSave, writeSave } from "./save";
import { getColorScheme } from "./colorSchemes";
import { FIRST_LEVEL_ID, getNextLevel } from "./levelData";

export interface LevelCompleteStats {
  levelId: string;
  timeMs: number;
  energy: number;
  totalEnergy: number;
  hidden: number;
  totalHidden: number;
  isNewBest: boolean;
}

interface StoreState {
  status: GameStatus;
  hud: HudSnapshot;
  save: SaveData;
  lastRunStats: LevelCompleteStats | null;
  selectedLevelId: string;
  runToken: number; // bumped on each (re)start so the canvas remounts the engine cleanly
  setStatus: (s: GameStatus) => void;
  selectLevel: (levelId: string) => void;
  startGame: (levelId?: string) => void;
  restart: () => void;
  updateHud: (hud: HudSnapshot) => void;
  completeLevel: (stats: Omit<LevelCompleteStats, "isNewBest">) => void;
  goTitle: () => void;
  openCustomize: () => void;
  closeCustomize: () => void;
  selectColor: (id: string) => void;
  toggleMute: () => void;
}

const initialHud: HudSnapshot = {
  form: "roll",
  energy: 0,
  totalEnergyInLevel: 0,
  hiddenFound: 0,
  totalHidden: 0,
  elapsedMs: 0,
  speedKph: 0,
  progress: 0,
  grounded: true,
  nearMagnetSurface: false,
  canGlide: true,
  message: null,
};

const initialSave = loadSave();

export const useGameStore = create<StoreState>((set, get) => ({
  status: "title",
  hud: initialHud,
  save: initialSave,
  lastRunStats: null,
  selectedLevelId: initialSave.selectedLevelId || FIRST_LEVEL_ID,
  runToken: 0,
  setStatus: (s) => set({ status: s }),
  selectLevel: (levelId) => {
    if (!get().save.unlockedLevelIds.includes(levelId)) return;
    const save = { ...get().save, selectedLevelId: levelId };
    writeSave(save);
    set({ selectedLevelId: levelId, save });
  },
  startGame: (levelId) => {
    const selectedLevelId = levelId ?? get().selectedLevelId;
    const save = { ...get().save, selectedLevelId };
    writeSave(save);
    set((st) => ({
      status: "playing",
      selectedLevelId,
      save,
      runToken: st.runToken + 1,
      lastRunStats: null,
    }));
  },
  restart: () => set((st) => ({ status: "playing", runToken: st.runToken + 1, lastRunStats: null })),
  updateHud: (hud) => set({ hud }),
  completeLevel: (stats) => {
    const save = { ...get().save };
    const previousLevelBest = save.bestTimes[stats.levelId]
      ?? (stats.levelId === FIRST_LEVEL_ID ? save.bestTimeMs : null);
    const isNewBest = previousLevelBest === null || previousLevelBest === undefined || stats.timeMs < previousLevelBest;
    if (save.bestTimeMs === null || stats.timeMs < save.bestTimeMs) save.bestTimeMs = stats.timeMs;
    save.bestEnergy = Math.max(save.bestEnergy, stats.energy);
    save.totalEnergyBanked += stats.energy;
    save.levelCompletedOnce = true;
    save.bestTimes = {
      ...save.bestTimes,
      [stats.levelId]: Math.min(previousLevelBest ?? Infinity, stats.timeMs),
    };
    const nextLevel = getNextLevel(stats.levelId);
    if (nextLevel && !save.unlockedLevelIds.includes(nextLevel.id)) {
      save.unlockedLevelIds = [...save.unlockedLevelIds, nextLevel.id];
    }
    writeSave(save);
    set({ status: "complete", save, lastRunStats: { ...stats, isNewBest } });
  },
  goTitle: () => set({ status: "title" }),
  openCustomize: () => set({ status: "customize" }),
  closeCustomize: () => set({ status: "title" }),
  selectColor: (id) => {
    const save = { ...get().save };
    if (!save.unlockedColors.includes(id)) {
      const scheme = getColorScheme(id);
      if (save.totalEnergyBanked >= scheme.cost) {
        save.unlockedColors = [...save.unlockedColors, id];
        save.totalEnergyBanked -= scheme.cost;
      } else {
        return;
      }
    }
    save.selectedColor = id;
    writeSave(save);
    set({ save });
  },
  toggleMute: () => {
    const save = { ...get().save };
    save.muted = !save.muted;
    writeSave(save);
    set({ save });
  },
}));
