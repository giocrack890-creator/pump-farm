# Hood Harvest

Gamified Robinhood Chain memecoin harvest for **$HOOD**. Players plant seeds,
harvest Season Points, and compete for a weekly Silo payout funded by the
launch's **real Pons creator fees**.

## Stack

- Next.js App Router + TypeScript
- **Robinhood Chain** (EVM L2, chain id `4663`) via wagmi + viem
- **Pons V2** for the launch: bonding curve → Uniswap V4 pool behind the Pons hook
- Tailwind CSS + dark AAA-meme theme
- Prisma + Supabase Postgres
- Vitest for payout / growth math

## Setup

```bash
cp .env.example .env.local
# Set DATABASE_URL from Supabase → Settings → Database
npm install
npm run db:generate
npm run db:push        # new tables: AppConfig, AdminAudit, FeeSnapshot
npm run dev
```

On **localhost**, use the gold **🛠 Dev play** button to bypass wallet login.

## Where the pot comes from

The Silo is the launch's Pons fees, read straight from chain — never estimated,
never a stand-in:

| Leg | Source |
|---|---|
| Claimable now | Pons fee escrow `balanceOf(creator)` |
| Still accruing | hook `pendingFees` + `pendingCreatorTax` for the pool |
| Already collected | ETH balance of the treasury wallet |

Claiming moves money from the escrow to the treasury, so all three are summed —
counting only the escrow would make the pot read `$0` the moment fees are
actually collected.

Check any launch by hand:

```bash
npm run pons:probe -- 0x<token>
```

When the chain cannot answer, the last confirmed figure is held and flagged
stale. When there has never been one, the pot is **null** and the UI shows a
dash. Nothing on the site invents a number.

## Pointing the game at a token

Set it once in `/admin → config`. It is a database row, not a build-time
constant, so it takes effect on the next request — the market cap, the CA card,
the fee pot and the staking check all follow it.

`NEXT_PUBLIC_TOKEN_MINT` still works as the seed value for a fresh deploy.

## Paying a season

```bash
npm run season:preview                  # what the current season would pay
ADMIN_TOKEN=… npm run payout -- --list  # what is owed right now
PAYOUT_PRIVATE_KEY=0x… npm run payout   # y / N / a per transfer
```

Three deliberate steps, and no request handler ever signs anything:

1. **Close** — `/admin → season`, or the nightly cron. Turns Season Points into
   `PayoutTx` rows measured against the on-chain pot. Requires `payoutsEnabled`.
2. **Send** — `npm run payout`, from an operator's machine, one keystroke per
   transfer, capped by `PAYOUT_MAX_ETH`.
3. **Record** — the script marks each row paid with its real hash and writes a
   `TreasuryTx`, which is what `/proof` shows.

A pending row has **no** transaction hash. It used to get `pending:<key>`, which
reads as money that already went out.

## Ops panel

`/admin` — live pot breakdown, market cap, who is online right now, runtime
config, the owed list, season close, and an audit trail of every ops action.
Sign in with `ADMIN_TOKEN`, or with a wallet listed in `ADMIN_WALLETS`.

## Chain

| Network | Chain ID | Public RPC |
|---|---|---|
| Robinhood Chain | 4663 | `https://rpc.mainnet.chain.robinhood.com` |
| Testnet | 46630 | `https://rpc.testnet.chain.robinhood.com` |

Set `NEXT_PUBLIC_RH_NETWORK=testnet` to use testnet. Set `RPC_URL` to a keyed
endpoint in production — the public RPC stays behind it as a fallback.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local app |
| `npm test` | Unit tests |
| `npm run pons:probe -- 0x…` | Read a launch's fees, price and market cap |
| `npm run season:preview` | What the open season would pay |
| `npm run payout` | Send what is owed, one prompt at a time |

## Security

- SP / harvest math is server-side only.
- Staking transfers are **verified on chain** before any multiplier is granted.
- Dev bypass is localhost-only; `ALLOW_DEV_BYPASS` and `DEMO_MODE` must be
  `false` in production.
- Payout keys never live on the server — only in the operator's shell, for the
  length of one `npm run payout`.
