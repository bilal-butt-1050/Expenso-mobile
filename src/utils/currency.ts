let activeCurrency = "PKR";

export function setActiveCurrency(currency: string) {
  if (currency) {
    activeCurrency = currency;
  }
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

// Centralized currency formatting across all screens. Formats values as whole units.
export function formatCurrency(amount: number, currency?: string): string {
  const curr = currency || activeCurrency || "PKR";
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded).toLocaleString("en-PK");
  const sign = rounded < 0 ? "-" : "";
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
