#!/usr/bin/env tsx
/**
 * Pay what the seasons settled, one transfer at a time, with a keystroke each.
 *
 *   ADMIN_TOKEN=… npm run payout -- --list         # who is owed what
 *   PAYOUT_PRIVATE_KEY=0x… npm run payout -- --dry-run
 *   PAYOUT_PRIVATE_KEY=0x… npm run payout          # y / N / a per payout
 *
 * At each prompt: `y` sends this one, `a` sends it and every remaining payout
 * without asking again, anything else skips it.
 *
 * The key comes from the environment, never from argv: an argument lands in
 * shell history and in the process list where anyone on the machine can read
 * it. It is never printed — only the address derived from it, and its balance.
 *
 * Nothing is marked paid until a receipt confirms it. If a send succeeds but
 * the API call afterwards fails, the hash is printed loudly — mark it by hand
 * in /admin rather than re-running, or the farmer is paid twice.
 */
// Must come first: it populates process.env before any module reads it.
import "./env.mts";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  createWalletClient,
  formatEther,
  parseEther,
  publicActions,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ACTIVE_CHAIN, chainTransport, EXPLORER_TX } from "../lib/chain/robinhood";

type Payout = {
  id: string;
  seasonNumber: number;
  address: string;
  amountEth: string;
  amountUsd: string | null;
  status: string;
};

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const dryRun = flags.has("--dry-run");
const listOnly = flags.has("--list");
const yesToAll = flags.has("--yes-to-all");

const SERVER = process.env.PUMPFARM_SERVER_URL ?? "http://127.0.0.1:3000";
const TOKEN = process.env.ADMIN_TOKEN?.trim();
/** A bug should not be able to drain the wallet in one run. */
const MAX_ETH = Number(process.env.PAYOUT_MAX_ETH ?? 1);

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

function die(message: string): never {
  console.error(`\n  ${c.red("✘")} ${message}\n`);
  process.exit(1);
}

if (!TOKEN) die("ADMIN_TOKEN is not set — the admin API is closed without it");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `${res.status} ${path}`,
    );
  }
  return body as T;
}

const { payouts, ethUsd, treasuryEth } = await api<{
  payouts: Payout[];
  ethUsd: number | null;
  treasuryEth: number;
}>("/api/admin/payouts?status=pending").catch((err: Error) =>
  die(`could not reach ${SERVER}: ${err.message}`),
);

console.log(c.bold("\n  Owed\n"));

if (payouts.length === 0) {
  console.log(`  ${c.dim("Nothing pending.")}\n`);
  process.exit(0);
}

let owed = 0;
for (const p of payouts) {
  const eth = Number(p.amountEth);
  owed += eth;
  const usd = ethUsd ? ` ${c.dim(`~$${(eth * ethUsd).toFixed(2)}`)}` : "";
  console.log(
    `  ${c.cyan(p.address)}  ${eth.toFixed(6)} ETH${usd}  ${c.dim(`season #${p.seasonNumber}`)}`,
  );
}
console.log(
  `\n  ${payouts.length} payout(s), ${c.bold(owed.toFixed(6))} ETH total` +
    (ethUsd ? c.dim(` (~$${(owed * ethUsd).toFixed(2)})`) : ""),
);
console.log(`  Treasury holds ${treasuryEth.toFixed(6)} ETH\n`);

if (listOnly) process.exit(0);

const rawKey = process.env.PAYOUT_PRIVATE_KEY?.trim();
if (!rawKey) {
  die("PAYOUT_PRIVATE_KEY is not set — export it for this run only, then unset it");
}
if (!/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
  die("PAYOUT_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
}

const account = privateKeyToAccount(rawKey as Hex);
const wallet = createWalletClient({
  account,
  chain: ACTIVE_CHAIN,
  transport: chainTransport({ batch: false }),
}).extend(publicActions);

const balance = await wallet.getBalance({ address: account.address });
console.log(
  `  Sending from ${c.cyan(account.address)} — ${formatEther(balance)} ETH available\n`,
);

if (Number(formatEther(balance)) < owed) {
  console.log(
    `  ${c.yellow("!")} Balance is below what is owed. Fund the wallet or expect the last sends to fail.\n`,
  );
}
if (dryRun) console.log(`  ${c.yellow("Dry run — nothing will be sent.")}\n`);

const rl = createInterface({ input: stdin, output: stdout });
let sendAll = yesToAll;
let sent = 0;
let skipped = 0;

for (const p of payouts) {
  const eth = Number(p.amountEth);

  if (!(eth > 0)) {
    console.log(`  ${c.dim(`skip ${p.address} — zero amount`)}`);
    skipped += 1;
    continue;
  }
  if (eth > MAX_ETH) {
    console.log(
      `  ${c.red("✘")} ${p.address} is ${eth} ETH, over PAYOUT_MAX_ETH (${MAX_ETH}). Skipping.`,
    );
    skipped += 1;
    continue;
  }

  if (!sendAll) {
    const answer = (
      await rl.question(
        `  Send ${c.bold(`${eth.toFixed(6)} ETH`)} to ${c.cyan(p.address)}? [y/N/a] `,
      )
    )
      .trim()
      .toLowerCase();
    if (answer === "a") sendAll = true;
    else if (answer !== "y") {
      skipped += 1;
      continue;
    }
  }

  if (dryRun) {
    console.log(`    ${c.dim("dry run — not sent")}`);
    sent += 1;
    continue;
  }

  let hash: Hex;
  try {
    hash = await wallet.sendTransaction({
      to: p.address as Hex,
      value: parseEther(p.amountEth),
    });
  } catch (err) {
    console.log(
      `    ${c.red("✘")} send failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    skipped += 1;
    continue;
  }

  const receipt = await wallet
    .waitForTransactionReceipt({ hash, timeout: 120_000 })
    .catch(() => null);

  if (!receipt || receipt.status !== "success") {
    console.log(`    ${c.red("✘")} ${hash} did not confirm — leaving it pending`);
    skipped += 1;
    continue;
  }

  try {
    await api(`/api/admin/payouts/${p.id}`, {
      method: "POST",
      body: JSON.stringify({ action: "paid", txHash: hash }),
    });
    console.log(`    ${c.green("✔")} ${EXPLORER_TX(hash)}`);
    sent += 1;
  } catch (err) {
    // The money moved. Losing the record is the one thing that causes a
    // double payment, so make it impossible to miss.
    console.log(
      `\n  ${c.red("!! SENT BUT NOT RECORDED")} ${p.address} ${eth} ETH\n` +
        `     hash: ${hash}\n` +
        `     mark it paid by hand in /admin before running this again.\n` +
        `     (${err instanceof Error ? err.message : String(err)})\n`,
    );
    sent += 1;
  }
}

rl.close();
console.log(
  `\n  ${c.bold(String(sent))} sent, ${skipped} skipped.${dryRun ? c.dim(" (dry run)") : ""}\n`,
);
