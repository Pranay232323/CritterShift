import type { ColorScheme } from "./types";

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: "copper", name: "Copper Classic", cost: 0, primary: "#e0824a", secondary: "#f4b860", accent: "#ffd23f" },
  { id: "mint", name: "Mint Circuit", cost: 15, primary: "#4fd1a5", secondary: "#9ff0cf", accent: "#2bb0ff" },
  { id: "violet", name: "Violet Volt", cost: 25, primary: "#9b6bf0", secondary: "#c9a8ff", accent: "#ff5fae" },
  { id: "ember", name: "Ember Spark", cost: 35, primary: "#ef5a5a", secondary: "#ffb15a", accent: "#ffe15a" },
  { id: "glacier", name: "Glacier Chrome", cost: 50, primary: "#6fb8e8", secondary: "#d7ecff", accent: "#ffffff" },
  { id: "midnight", name: "Midnight Gear", cost: 70, primary: "#3a3d6b", secondary: "#6a6fb0", accent: "#ff5fae" },
];

export function getColorScheme(id: string): ColorScheme {
  return COLOR_SCHEMES.find((c) => c.id === id) ?? COLOR_SCHEMES[0];
}
