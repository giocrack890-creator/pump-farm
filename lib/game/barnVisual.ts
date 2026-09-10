/** Farm Level visual milestones for the main exchange building.
 * Pack ships a single farmhouse — tiers are tint/label only (see MANIFEST.md).
 */
export type BarnVisual = 1 | 5 | 10 | 15 | 20;

export function barnVisualFromLevel(level: number): BarnVisual {
  if (level >= 20) return 20;
  if (level >= 15) return 15;
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
}

export function barnTextureKey(_level: number): string {
  return "farmhouse";
}

export const BARN_MILESTONE_LABELS: Record<BarnVisual, string> = {
  1: "Starter Farmhouse",
  5: "Settled Homestead",
  10: "Working Farm",
  15: "Established Estate",
  20: "Legacy Farm",
};
