import type { SaveData } from "./types";
import { LEVELS } from "./levelData";
import { VEHICLES } from "./vehicles";

const KEY = "crittershift-save-v1";

const DEFAULT_SAVE: SaveData = {
  bestTimeMs: null,
  bestEnergy: 0,
  totalEnergyBanked: 0,
  hiddenFound: [],
  unlockedColors: ["copper"],
  selectedColor: "copper",
  levelCompletedOnce: false,
  unlockedLevelIds: LEVELS.map((level) => level.id),
  selectedLevelId: "mechanical-garden",
  bestTimes: {},
  unlockedVehicleIds: ["sprout"],
  selectedVehicleId: "sprout",
  vehicleUpgrades: { engine: 0, suspension: 0, jump: 0 },
  muted: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw);
    const unlockedVehicleIds = Array.isArray(parsed.unlockedVehicleIds)
      ? [...new Set(["sprout", ...parsed.unlockedVehicleIds])]
      : DEFAULT_SAVE.unlockedVehicleIds;
    const selectedLevelId = LEVELS.some((level) => level.id === parsed.selectedLevelId)
      ? parsed.selectedLevelId
      : DEFAULT_SAVE.selectedLevelId;
    const selectedVehicleId = VEHICLES.some((vehicle) => vehicle.id === parsed.selectedVehicleId)
      && unlockedVehicleIds.includes(parsed.selectedVehicleId)
      ? parsed.selectedVehicleId
      : DEFAULT_SAVE.selectedVehicleId;

    return {
      ...DEFAULT_SAVE,
      ...parsed,
      unlockedLevelIds: [...new Set([...DEFAULT_SAVE.unlockedLevelIds, ...(Array.isArray(parsed.unlockedLevelIds) ? parsed.unlockedLevelIds : [])])],
      selectedLevelId,
      bestTimes: parsed.bestTimes && typeof parsed.bestTimes === "object" ? parsed.bestTimes : {},
      unlockedVehicleIds,
      selectedVehicleId,
      vehicleUpgrades: {
        engine: boundedUpgrade(parsed.vehicleUpgrades?.engine),
        suspension: boundedUpgrade(parsed.vehicleUpgrades?.suspension),
        jump: boundedUpgrade(parsed.vehicleUpgrades?.jump),
      },
    };
  } catch (error) {
    console.error("Unable to read the CritterShift save; using a fresh save.", error);
    return { ...DEFAULT_SAVE };
  }

  function boundedUpgrade(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(5, Math.floor(value))) : 0;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Unable to persist the CritterShift save.", error);
  }
}
