/** XP curve & Farm Level gates — named constants, no magic numbers. */

export const XP_BASE = 100;
export const XP_EXPONENT = 1.45;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXPONENT));
}

export function xpToNextLevel(level: number): number {
  return xpForLevel(level + 1) - xpForLevel(level);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  current: number;
  next: number;
  ratio: number;
} {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = xp - floor;
  const span = Math.max(1, next - floor);
  return { level, current, next: span, ratio: Math.min(1, current / span) };
}

/** Level gates — document unlock pacing. */
export const LEVEL_GATES = {
  hybridSeeds: 5,
  firstExpansion: 5,
  goldenSeeds: 10,
  companion: 10,
  secondExpansion: 10,
  barnTier2: 15,
  decorate: 20,
  barnTier3: 20,
  mythicSeeds: 18,
} as const;

export const XP_REWARDS = {
  harvestBasic: 8,
  harvestHybrid: 16,
  harvestGolden: 28,
  harvestMythic: 45,
  plantFirstOfTier: 40,
  dailyQuest: 25,
  levelUpBonus: 0,
} as const;
