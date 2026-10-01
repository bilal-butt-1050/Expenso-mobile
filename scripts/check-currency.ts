/** Self-check for money formatting: `npx tsx scripts/check-currency.ts` (no test runner in mobile). */
import { formatCurrency, formatCurrencyCompact } from "../src/utils/currency";

const cases: [string, string][] = [
  [formatCurrency(25000, "PKR"), "Rs 25,000"],
  [formatCurrency(12.5, "USD"), "USD 12.50"],
  [formatCurrency(49987.5, "USD"), "USD 49,987.50"],
  [formatCurrency(0.1 + 0.2, "PKR"), "Rs 0.30"],
  [formatCurrency(-1234567.891, "PKR"), "-Rs 1,234,567.89"],
  [formatCurrency(-0.001, "PKR"), "Rs 0"],
  [formatCurrency(999999999999.99, "PKR"), "Rs 999,999,999,999.99"],
  [formatCurrencyCompact(1240500, "PKR"), "Rs 12.4L"],
  [formatCurrencyCompact(1240500, "USD"), "USD 1.2M"],
  [formatCurrencyCompact(45200, "USD"), "USD 45.2K"],
  [formatCurrencyCompact(950, "USD"), "USD 950"],
];
let failed = 0;
for (const [actual, expected] of cases) {
  if (actual !== expected) {
    failed++;
    console.error(`FAIL: got "${actual}", expected "${expected}"`);
  }
}
console.log(failed ? `${failed} failed` : `all ${cases.length} passed`);
process.exit(failed ? 1 : 0);
