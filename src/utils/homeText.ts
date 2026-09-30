import { BudgetVsActualItem, CategoryBreakdownItem, MonthPeriod, SpendingComparison } from "../types/models";
import { formatMonthShort, shiftMonth } from "./date";

/**
 * Home v3's wording and choices, as pure functions (R-35..R-39), so they can be tested without a
 * device (M6: INS-001..006, LBL-001..004).
 */

/** The hero's label, from where the month sits relative to today (R-35). */
export function heroLabel(period: MonthPeriod, month: string): string {
  if (period === "current") return "Cash available";
  if (period === "past") return `Cash at end of ${formatMonthShort(month)}`;
  return `Expected at end of ${formatMonthShort(month)}`;
}

/**
 * The "Saved" line (R-36): signed, never clamped. Null for a future month with nothing in it yet.
 */
export function savedLine(
  income: number,
  expenses: number,
  period: MonthPeriod
): { label: string; amount: number; overspent: boolean } | null {
  if (period === "future" && income === 0 && expenses === 0) return null;
  const saved = income - expenses;
  const soFar = period === "current" ? " so far" : "";
  return saved < 0
    ? { label: `Overspent${soFar}`, amount: -saved, overspent: true }
    : { label: `Saved${soFar}`, amount: saved, overspent: false };
}

/** The top categories by spending, then the rest as "+ N more" (R-37). */
export function spendingSummary(breakdown: CategoryBreakdownItem[], top = 4) {
  const sorted = [...breakdown].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  const rest = sorted.slice(top);
  return {
    top: sorted.slice(0, top),
    restCount: rest.length,
    restTotal: rest.reduce((t, c) => t + c.amount, 0),
    max: sorted[0]?.amount ?? 0,
  };
}

/** A budget's share of its limit used, as a ratio. */
export const budgetUsage = (b: Pick<BudgetVsActualItem, "budget" | "actual">) => (b.budget > 0 ? b.actual / b.budget : 0);

/** Budgets at 80% of their limit or over, most used first, at most 3 (R-38). */
export function budgetsNeedingAttention(items: BudgetVsActualItem[], limit = 3): BudgetVsActualItem[] {
  return items
    .filter((b) => b.budget > 0 && budgetUsage(b) >= 0.8)
    .sort((a, b) => budgetUsage(b) - budgetUsage(a))
    .slice(0, limit);
}

/** The minimum rise, in the account's currency units, for a category to be worth mentioning. */
const CATEGORY_RISE_MIN = 1_000;

/**
 * At most one observation about spending (R-39), or null when nothing is meaningful.
 *
 * 1. The category with the largest rise, among those that spent something last time and are at
 *    least 25% and 1,000 higher.
 * 2. Otherwise the total, when it moved by 10% or more.
 *
 * For the current month both sides stop at the same day, and the wording says so.
 */
export function insightFor(
  comparison: SpendingComparison | null,
  period: MonthPeriod,
  month: string,
  nameOf: (categoryId: string) => string | undefined
): string | null {
  if (!comparison || period === "future") return null;
  const previousMonth = formatMonthShort(shiftMonth(month, -1));
  const than = period === "current" ? `than by this point in ${previousMonth}` : `than ${previousMonth}`;

  const previous = new Map(comparison.previousByCategory.map((c) => [c.categoryId, c.amount]));
  let best: { name: string; rise: number; pct: number } | null = null;
  for (const current of comparison.currentByCategory) {
    const before = previous.get(current.categoryId) ?? 0;
    const rise = current.amount - before;
    if (before <= 0 || current.amount < before * 1.25 || rise < CATEGORY_RISE_MIN) continue;
    const name = nameOf(current.categoryId);
    if (!name) continue;
    if (!best || rise > best.rise) best = { name, rise, pct: Math.round((rise / before) * 100) };
  }
  if (best) return `${best.name} spending is ${best.pct}% higher ${than}`;

  const { currentTotal, previousTotal } = comparison;
  if (previousTotal <= 0) return null;
  const change = (currentTotal - previousTotal) / previousTotal;
  if (Math.abs(change) < 0.1) return null;
  return `You spent ${Math.round(Math.abs(change) * 100)}% ${change < 0 ? "less" : "more"} ${than}`;
}

