# Hood Harvest — on-chain contracts (Robinhood Chain)

**Chain ID:** `4663`  
**RPC:** `https://rpc.mainnet.chain.robinhood.com`  
**Explorer (Blockscout):** `https://explorer.mainnet.chain.robinhood.com`  
**Testnet faucet:** `https://faucet.testnet.chain.robinhood.com`  
**Native gas:** ETH

## Contracts

| File | Purpose |
|------|---------|
| `FarmToken.sol` | OpenZeppelin ERC-20 `$HOOD` |
| `SeasonDisperse.sol` | Batched multi-send for Season / Harvest Round payouts |

## Hard gates before mainnet funds

1. **Audit** both contracts (or use an already-audited disperse) before any real treasury / user payouts.
2. **Verify** source on Blockscout after deploy.
3. Ops wallet holds **ETH for gas** (not SOL). Keep blast-radius containment (minimally funded ops key).
4. Off-chain payout scheduler keeps **Decimal math, dry-run, idempotency, feature-flag off by default** — only the on-chain execution path changes.
5. Do **not** market “buy $HOOD in the Robinhood brokerage app” unless that separate listing exists.

## Env after deploy

```bash
NEXT_PUBLIC_TOKEN_MINT=0x…   # verified ERC-20
NEXT_PUBLIC_TOKEN_LIVE=true  # only after audit + verify
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
# staging:
NEXT_PUBLIC_RH_NETWORK=testnet
```

Use Foundry or Hardhat locally; this repo does not ship a full forge toolchain yet — add one when you are ready to deploy to testnet.
