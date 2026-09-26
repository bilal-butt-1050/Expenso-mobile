import { formatCurrency } from "./currency";
import { formatMonthShort } from "./date";

export interface BudgetNotice {
  id: "S-2" | "S-3";
  text: string;
}

/**
 * What to tell the user after a save moved a category's spending (DESIGN §S3, R-3). Pure, so it's
 * testable: the save has already happened, and this only decides the notice.
 *
 * - S-2: the save took the category over its budget.
 * - S-3: the save crossed 80% (it was below 80%, and is still within budget).
 * Anything else, including no budget for that month, gives no notice.
 */
export function budgetNoticeFor(opts: {
  categoryName: string;
  month: string;
  budget: number;
  before: number;
  after: number;
}): BudgetNotice | null {
  const { categoryName, month, budget, before, after } = opts;
  if (!(budget > 0) || after <= before) return null;
  const mon = formatMonthShort(month);

  if (after > budget) {
    // Only when this save is what pushed it over; an already-over category doesn't re-nag.
    if (before > budget) return null;
    return { id: "S-2", text: `${categoryName} is ${formatCurrency(after - budget)} over its ${mon} budget` };
  }
  if (before < budget * 0.8 && after >= budget * 0.8) {
    return { id: "S-3", text: `${categoryName} is at ${Math.floor((after / budget) * 100)}% of its ${mon} budget` };
  }
  return null;
}
