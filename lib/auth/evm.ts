import { getAddress, isAddress, verifyMessage, type Hex, type Address } from "viem";

/** EVM address validation — accept non-checksummed / mixed-case from wallets. */
export function isEvmWalletAddress(value: string): boolean {
  try {
    return isAddress(value.trim(), { strict: false });
  } catch {
    return false;
  }
}

/** Store/compare as lowercase hex (checksummed parse, then lower). */
export function normalizeEvmAddress(value: string): Address {
  return getAddress(value.trim()).toLowerCase() as Address;
}

export async function verifyEvmMessageSignature(params: {
  address: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  try {
    if (!isAddress(params.address, { strict: false })) return false;
    return await verifyMessage({
      address: getAddress(params.address),
      message: params.message,
      signature: params.signature as Hex,
    });
  } catch {
    return false;
  }
}
