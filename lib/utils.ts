import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Shorten an EVM address for UI display (`0x1234…abcd`).
 * Supports truncateAddress(addr, 4) or truncateAddress(addr, 6, 4).
 */
export function truncateAddress(
  addr: string,
  startOrChars: number = 4,
  end?: number,
): string {
  if (!addr) return "";
  const start = addr.startsWith("0x") || addr.startsWith("0X")
    ? Math.max(startOrChars + 2, 6)
    : startOrChars;
  const tail = end ?? startOrChars;
  if (addr.length <= start + tail) return addr;
  return `${addr.slice(0, start)}…${addr.slice(-tail)}`;
}

export function formatNumber(value: number | string, digits = 0): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(num);
}
