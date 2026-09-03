import { asNumber } from "./cn";

/**
 * Currency formatting utilities. Kept dependency-free so they work off-line and
 * are deterministic. Amounts follow ERPNext conventions (2 decimals by default).
 */

const DEFAULT_CURRENCY = "USD";

/** Compact number -> "12.5M", "365.2K". */
export function compactNumber(value: number): string {
  if (Number.isNaN(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "₨",
  INR: "₹",
  AED: "د.إ",
  SAR: "﷼",
  CAD: "C$",
  CNY: "¥",
  JPY: "¥",
};

export function currencySymbol(currency = DEFAULT_CURRENCY): string {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? `${currency} `;
}

export interface MoneyFormatOptions {
  decimals?: number;
  compact?: boolean;
  symbol?: string;
}

/** Format a number as money for a given currency code. */
export function formatMoney(
  value: number | null | undefined,
  currency = DEFAULT_CURRENCY,
  options: MoneyFormatOptions = {},
): string {
  const n = asNumber(value);
  const symbol = options.symbol ?? currencySymbol(currency);
  const decimals =
    options.decimals ?? (options.compact ? 1 : currency === "PKR" ? 0 : 2);

  const formatted = options.compact
    ? compactNumber(n)
    : n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return `${symbol}${formatted}`;
}

/** Plain number formatting (no symbol). */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  return asNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}