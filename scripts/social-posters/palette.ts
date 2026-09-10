/** Landing / kit palette — mirrors `components/landing/PixelIcon.tsx` + `landing.css`. */
export const PAL = {
  wood: "#5b3c23",
  woodMid: "#8a5f36",
  woodLite: "#a67c45",
  parchment: "#f6ecd4",
  cream: "#fbf3e0",
  card: "#fff8eb",
  gold: "#d69a2d",
  goldLite: "#f0c45a",
  goldDeep: "#a87018",
  green: "#5c8a3a",
  greenDark: "#3d5c28",
  greenLite: "#8bb85a",
  red: "#a8433a",
  blue: "#4a7fae",
  ink: "#3a2414",
  silver: "#9aa0a8",
  silverLite: "#c8ccd2",
  white: "#fffdf6",
  black: "#1a1008",
  soil: "#6b4a2e",
} as const;

export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}
