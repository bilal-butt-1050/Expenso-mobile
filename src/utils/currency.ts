// Centralized currency formatting across all screens. Formats values as whole units.
export function formatCurrency(amount: number, currency = "PKR"): string {
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded).toLocaleString("en-PK");
  const sign = rounded < 0 ? "-" : "";
  const symbol = currency === "PKR" ? "Rs" : currency;
  return `${sign}${symbol} ${formatted}`;
}
