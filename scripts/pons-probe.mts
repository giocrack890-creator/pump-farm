#!/usr/bin/env tsx
/**
 * Read a Pons launch straight from the chain — fees, price, market cap.
 *
 *   npm run pons:probe -- 0x<token>
 *
 * This is the number the pot is a percentage of, so it is worth being able to
 * check by hand: a pot that looks wrong on the page is either this figure or
 * the split, and this tells you which.
 */
// Must come first: it populates process.env before any module reads it.
import "./env.mts";
import { formatEther } from "viem";
import { resolveLaunch } from "../lib/pons/launch";
import {
  readCirculatingSupply,
  readCreatorFees,
  readTreasuryBalance,
} from "../lib/pons/fees";
import { launchPriceEth } from "../lib/pons/price";
import { ethUsdPrice } from "../lib/market/ethUsd";
import { serverRpcUrl } from "../lib/chain/robinhood";

const token = process.argv[2] ?? process.env.NEXT_PUBLIC_TOKEN_MINT;
if (!token) {
  console.error("usage: npm run pons:probe -- 0x<token>");
  process.exit(1);
}

console.log(`rpc      ${serverRpcUrl().replace(/\/v2\/.*/, "/v2/****")}`);

const launch = await resolveLaunch(token);
const [fees, ethUsd, supply, priceEth] = await Promise.all([
  readCreatorFees(launch),
  ethUsdPrice(),
  readCirculatingSupply(launch),
  launchPriceEth(launch),
]);

const eth = (wei: bigint) => `${Number(formatEther(wei)).toFixed(8)} ETH`;
const usd = (wei: bigint) =>
  ethUsd ? `~$${(Number(formatEther(wei)) * ethUsd).toFixed(2)}` : "(no eth price)";

console.log(`token    ${launch.symbol || "?"}  ${launch.token}`);
console.log(`venue    ${launch.venue}${launch.pool?.poolId ? `  ${launch.pool.poolId}` : ""}`);
console.log(`creator  ${fees.creator ?? "(unknown)"}`);
console.log(`eth/usd  $${ethUsd.toFixed(2)}`);

if (launch.curve) {
  console.log(`\n=== BONDING CURVE ===`);
  console.log(`  contract    ${launch.curve.address}`);
  console.log(`  graduated   ${launch.curve.graduated}`);
  console.log(
    `  progress    ${
      launch.curve.graduationProgress != null
        ? `${(launch.curve.graduationProgress * 100).toFixed(2)}%`
        : "n/a"
    }`,
  );
  console.log(`  creatorTax  ${launch.curve.creatorTaxBps ?? "?"} bps`);
  console.log(`  poolFee     ${launch.curve.feeBps ?? "?"} bps`);
}

console.log(`\n=== FEES ===`);
console.log(`  claimable   ${eth(fees.claimableWei)}  ${usd(fees.claimableWei)}`);
console.log(`  pending     ${eth(fees.pendingWei)}  ${usd(fees.pendingWei)}`);
console.log(`  TOTAL       ${eth(fees.totalWei)}  ${usd(fees.totalWei)}`);
if (fees.pendingTokenRaw > 0n || fees.escrowTokenRaw > 0n) {
  console.log(`  token leg   pending ${fees.pendingTokenRaw} · escrow ${fees.escrowTokenRaw}`);
}

const treasury = process.env.TREASURY_WALLET_ADDRESS;
if (treasury) {
  const bal = await readTreasuryBalance(treasury);
  console.log(`  treasury    ${eth(bal)}  ${usd(bal)}`);
}

const priceUsd = priceEth * ethUsd;
console.log(`\n=== MARKET ===`);
console.log(`  price       ${priceEth.toExponential(4)} ETH  $${priceUsd.toExponential(4)}`);
console.log(`  supply      ${supply.totalSupply.toLocaleString()} total`);
console.log(`  circulating ${supply.circulatingSupply.toLocaleString()}`);
console.log(`  market cap  $${(priceUsd * supply.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
console.log(
  `  circ. mcap  $${(priceUsd * supply.circulatingSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
);
