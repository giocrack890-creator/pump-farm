/** Farm Level visual milestones for the main exchange building. */
export type BarnVisual = 1 | 5 | 10 | 15 | 20;

export function barnVisualFromLevel(level: number): BarnVisual {
  if (level >= 20) return 20;
  if (level >= 15) return 15;
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
}

export function barnTextureKey(level: number): string {
  return `building_barn_l${barnVisualFromLevel(level)}`;
}

export const BARN_MILESTONE_LABELS: Record<BarnVisual, string> = {
  1: "Starter Exchange",
  5: "Flagship Shed",
  10: "Neon Barn",
  15: "Bull Market Hall",
  20: "Ticker Tower",
};
