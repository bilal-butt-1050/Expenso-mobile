let activeCurrency = "PKR";

export function setActiveCurrency(currency: string) {
  if (currency) {
    activeCurrency = currency;
  }
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

/** "1234567" -> "1,234,567". Explicit, because Hermes's Intl grouping isn't reliable (rn-review 6.3). */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Centralized currency formatting across all screens. Whole amounts show no decimals
 * ("Rs 25,000"); anything else shows its cents ("USD 12.50"), so figures always add up.
 */
export function formatCurrency(amount: number, currency?: string): string {
  const curr = currency || activeCurrency || "PKR";
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const formatted = groupThousands(String(whole)) + (fraction ? `.${String(fraction).padStart(2, "0")}` : "");
  const sign = amount < 0 && cents > 0 ? "-" : "";
  const symbol = curr === "PKR" ? "Rs" : curr;
  return `${sign}${symbol} ${formatted}`;
}

// Formats a raw input string with commas as the user types
export function formatAmountInput(text: string): string {
  let cleaned = text.replace(/[^0-9.]/g, '');
  
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  const finalParts = cleaned.split('.');
  finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  return finalParts.join('.');
}

// Lakh/crore compact form for a figure that doesn't fit on one line (D-30, DESIGN NFR-4):
// Rs 45.2K, Rs 12.4L, Rs 1.2Cr. One decimal, truncated toward zero so a compact figure never
// overstates a balance or jumps a unit (99,999 → 99.9K, not 100K). Under 1,000 it never compacts.
const COMPACT_TIERS: [number, string][] = [
  [1_00_00_000, "Cr"],
  [1_00_000, "L"],
  [1_000, "K"],
];
/** Lakh and crore are South Asian; every other currency compacts in thousands, millions, billions. */
const COMPACT_TIERS_WESTERN: [number, string][] = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "K"],
];

export function formatCurrencyCompact(amount: number, currency?: string): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const tierCurrency = currency || activeCurrency || "PKR";
  const tiers = tierCurrency === "PKR" || tierCurrency === "INR" ? COMPACT_TIERS : COMPACT_TIERS_WESTERN;
  const tier = tiers.find(([divisor]) => abs >= divisor);
  if (!tier) return formatCurrency(amount, currency);

  const [divisor, unit] = tier;
  // Integer arithmetic, so e.g. 12,00,000 is exactly 120 tenths rather than 119.99999…
  const tenths = Math.floor((abs * 10) / divisor);
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  const curr = currency || activeCurrency || "PKR";
  const symbol = curr === "PKR" ? "Rs" : curr;
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${symbol} ${decimal === 0 ? whole : `${whole}.${decimal}`}${unit}`;
}

// What a screen reader should say: the full value, with "minus" rather than a dash.
export function formatCurrencySpoken(amount: number, currency?: string): string {
  const full = formatCurrency(amount, currency);
  return full.startsWith("-") ? `minus ${full.slice(1)}` : full;
}

/** The currencies the server accepts (auth.routes `SUPPORTED_CURRENCIES`), for the sign-up choice. */
export const CURRENCY_OPTIONS: { code: string; name: string }[] = [
  { code: "PKR", name: "Pakistani rupee" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "AED", name: "UAE dirham" },
  { code: "SAR", name: "Saudi riyal" },
  { code: "INR", name: "Indian rupee" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
];

