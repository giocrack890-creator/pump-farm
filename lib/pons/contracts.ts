import { parseAbi } from "viem";

/**
 * Pons V2 on Robinhood Chain — the addresses and interfaces a launch's fees
 * live behind.
 *
 * A Pons token has two lives and the fee number is read differently in each:
 *
 *   BONDING CURVE  A fresh launch trades against a curve contract holding the
 *                  whole supply. No Uniswap pool exists yet, so the hook knows
 *                  nothing about it — fees are credited straight to the shared
 *                  fee escrow as trades happen.
 *   GRADUATED      Once the curve fills (`graduationThreshold` of ETH raised)
 *                  the launch moves to a Uniswap V4 pool behind the Pons hook,
 *                  which charges each swap and parks it per-pool as
 *                  `pendingFees` / `pendingCreatorTax` until a sweep credits
 *                  the escrow.
 *
 * Interfaces from github.com/ponsdotdev/ponsfamily → contractsV2/src/v2.
 */

export const PONS_FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as const;
export const PONS_HOOK = "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044" as const;
export const PONS_FEE_ESCROW = "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e" as const;
export const PONS_BUYBACK_VAULT = "0x42df2a798f82289E177311362e8f5ccC45c1219c" as const;
export const V4_POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951" as const;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

export const hookAbi = parseAbi([
  "function feeEscrow() view returns (address)",
  "function pendingFees(bytes32 poolId, address currency) view returns (uint256)",
  "function pendingCreatorTax(bytes32 poolId, address currency) view returns (uint256)",
  "function launches(bytes32 poolId) view returns (bool registered, bool memecoinIsCurrency0, address memecoin, address quoteToken, address creator, address buybackCreatorRecipient, address protocolFeeRecipient, uint16 creatorTaxBps, uint16 protocolFeeShareBps, uint16 buybackBurnBps, uint16 hookFeeBps, uint16 maxInternalPriceImpactBps, bool buybackEnabled)",
]);

export const escrowAbi = parseAbi([
  "function balanceOf(address recipient) view returns (uint256)",
  "function balanceOfToken(address recipient, address token) view returns (uint256)",
  "function claim()",
  "function claimToken(address token)",
]);

/** Only the getters the curve actually exposes — verified against a live launch. */
export const curveAbi = parseAbi([
  "function token() view returns (address)",
  "function graduated() view returns (bool)",
  "function deployer() view returns (address)",
  "function feeEscrow() view returns (address)",
  "function factory() view returns (address)",
  "function protocolFeeRecipient() view returns (address)",
  "function buybackCreatorRecipient() view returns (address)",
  "function graduationThreshold() view returns (uint256)",
  "function tokenReserve() view returns (uint256)",
  "function creatorTaxBps() view returns (uint16)",
  "function feeBps() view returns (uint16)",
  "function protocolFeeShareBps() view returns (uint16)",
  "function getReserves() view returns (uint256, uint256)",
]);

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
]);

export const transferEvent = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

export const v4InitializeEvent = {
  type: "event",
  name: "Initialize",
  inputs: [
    { name: "id", type: "bytes32", indexed: true },
    { name: "currency0", type: "address", indexed: true },
    { name: "currency1", type: "address", indexed: true },
    { name: "fee", type: "uint24", indexed: false },
    { name: "tickSpacing", type: "int24", indexed: false },
    { name: "hooks", type: "address", indexed: false },
    { name: "sqrtPriceX96", type: "uint160", indexed: false },
    { name: "tick", type: "int24", indexed: false },
  ],
} as const;

export const v4SwapEvent = {
  type: "event",
  name: "Swap",
  inputs: [
    { name: "id", type: "bytes32", indexed: true },
    { name: "sender", type: "address", indexed: true },
    { name: "amount0", type: "int128", indexed: false },
    { name: "amount1", type: "int128", indexed: false },
    { name: "sqrtPriceX96", type: "uint160", indexed: false },
    { name: "liquidity", type: "uint128", indexed: false },
    { name: "tick", type: "int24", indexed: false },
    { name: "fee", type: "uint24", indexed: false },
  ],
} as const;
