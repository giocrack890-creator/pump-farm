# Pump Farm

Gamified Robinhood Chain memecoin farm for **$FARM** (`pump.farm`). Players plant Pump Seeds, harvest Season Points, and compete for a weekly Silo payout funded by real trading fees.

## Stack

- Next.js App Router + TypeScript
- **Robinhood Chain** (EVM L2, chain id `4663`) via wagmi + viem
- Tailwind CSS + dark AAA-meme theme
- Prisma + Supabase Postgres
- Vitest for payout/growth math

## Setup

```bash
cp .env.example .env.local
# Set DATABASE_URL from Supabase → Settings → Database
npm install
npm run db:generate
npm run dev
```

On **localhost**, use the gold **🛠 Dev play** button to bypass wallet login and jump into `/play`.

## Chain

| Network | Chain ID | Public RPC |
|---|---|---|
| Robinhood Chain | 4663 | `https://rpc.mainnet.chain.robinhood.com` |
| Testnet | 46630 | `https://rpc.testnet.chain.robinhood.com` |

Set `NEXT_PUBLIC_RH_NETWORK=testnet` to use testnet.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local app (webpack) |
| `npm test` | Unit tests |
| `npm run payout:dry-run` | Season payout table (no sends) |

## Security

- SP/harvest math is server-side only.
- Dev bypass is localhost-only.
- Staking v1 is escrow-tracked — audit before mainnet scale.
