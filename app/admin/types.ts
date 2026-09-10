export type PotSnapshotDto = {
  ok: boolean;
  reason: string | null;
  stale: boolean;
  token: string | null;
  symbol: string | null;
  venue: string | null;
  creator: string | null;
  treasury: string | null;
  ethUsd: number;
  claimableEth: number;
  pendingEth: number;
  treasuryEth: number;
  potEth: number;
  potUsd: number | null;
  claimableUsd: number | null;
  pendingUsd: number | null;
  treasuryUsd: number | null;
  graduationProgress: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  circulatingMarketCapUsd: number | null;
  totalSupply: number;
  circulatingSupply: number;
  volume24hUsd: number | null;
  change24hPct: number | null;
  curve: string | null;
  poolId: string | null;
  siloTargetEth: number;
  updatedAt: number;
};

export type AdminConfigDto = {
  tokenAddress: string | null;
  tokenTicker: string;
  creatorAddress: string | null;
  treasuryAddress: string | null;
  stakeEscrowAddress: string | null;
  siloTargetEth: number;
  opsReservePct: number;
  payoutsEnabled: boolean;
};

export type OnlinePlayerDto = {
  address: string;
  displayName: string | null;
  lastSeenAt: string | null;
  hypeBalance: string;
  harvestStreak: number;
  flaggedSybil: boolean;
  seasonPoints: string;
};

export type OverviewDto = {
  now: string;
  identity: { actor: string; via: string };
  pot: PotSnapshotDto;
  config: AdminConfigDto;
  season: {
    id: string;
    number: number;
    startsAt: string;
    endsAt: string;
    closedAt: string | null;
    msRemaining: number;
  };
  counts: {
    online: number;
    wallets: number;
    plantedToday: number;
    onlineWindowMinutes: number;
  };
  online: OnlinePlayerDto[];
  payouts: { status: string; count: number; totalEth: string }[];
  audit: {
    id: string;
    actor: string;
    action: string;
    detail: string | null;
    createdAt: string;
  }[];
};

export type PayoutDto = {
  id: string;
  seasonId: string;
  seasonNumber: number;
  address: string;
  amountEth: string;
  amountUsd: string | null;
  status: string;
  txHash: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PayoutsDto = {
  payouts: PayoutDto[];
  totals: { status: string; count: number; totalEth: string }[];
  ethUsd: number | null;
  treasury: string | null;
  treasuryEth: number;
};

export type CloseResultDto = {
  ok: boolean;
  dryRun: boolean;
  reason?: string;
  seasonNumber?: number;
  poolEth?: string;
  payoutCount?: number;
  note?: string;
  computation?: {
    totalPool: string;
    reserve: string;
    distributable: string;
    activeCount: number;
    payouts: { address: string; amount: string; tier: number }[];
  };
};
