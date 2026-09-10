/** Shared richness score — used client + server so hydrate never downgrades progress. */

export function demoSaveScore(save: {
  xp?: number;
  hypeBalance?: number | string;
  seasonPoints?: number | string;
  farmers?: unknown[];
  ownedAnimals?: unknown[];
  plots?: { seedTier?: string | null }[];
}): number {
  const planted = (save.plots ?? []).filter((p) => p.seedTier).length;
  return (
    (Number(save.xp) || 0) * 1_000 +
    (Number(save.hypeBalance) || 0) +
    (Number(save.seasonPoints) || 0) * 10 +
    (save.farmers?.length ?? 0) * 500 +
    (save.ownedAnimals?.length ?? 0) * 200 +
    planted * 50
  );
}
