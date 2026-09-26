// These mirror the backend's response shapes exactly. Keeping them in one
// file means the API layer, hooks, and screens all agree on what an
// "Expense" or "Category" looks like without guessing.

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  avatarUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export type PaymentMethod = "Card" | "Bank Transfer" | "Cash" | "Cheque";
export type NeedWant = "Need" | "Want";
export type ExpenseStatus = "Paid";

export interface Expense {
  id: string;
  categoryId: string;
  category: Category;
  date: string; // ISO string
  month: string; // "YYYY-MM"
  description: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  needWant: NeedWant;
  status?: ExpenseStatus;
}

export interface ExpenseInput {
  categoryId: string;
  date: string;
  description?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  needWant: NeedWant;
  status?: ExpenseStatus;
}


export interface Income {
  id: string;
  userId?: string;
  date: string; // ISO string
  month: string; // "YYYY-MM"
  source: string;
  sourceIcon: string;
  sourceColor: string;
  description: string | null;
  amount: number;
  paymentMethod: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeInput {
  date: string; // ISO string
  source: string;
  sourceIcon?: string;
  sourceColor?: string;
  description?: string;
  amount: number;
  paymentMethod?: string;
}

export interface IncomeSummary {
  month: string;
  totalIncome: number;
}

export interface Budget {
  categoryId: string;
  category: Category;
  amount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
}

export interface BudgetVsActualItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  actual: number;
  remaining: number;
  status: "On Track" | "Over Budget";
}

export interface TrendPoint {
  month: string;
  totalExpenses: number;
}

export interface NetDebtSnapshot {
  totalLent: number;
  totalBorrowed: number;
  net: number;
}

export interface UpcomingObligation {
  id: string;
  type: LoanType;
  personName: string;
  remainingAmount: number;
  dueDate: string;
  isOverdue: boolean;
}

export interface DashboardSummary {
  month: string;

  // Balance sheet: measured at one instant, the END of `month` (D-9).
  /** Sum of every cash movement to the end of this month. Equals `closingCash`. */
  cashOnHand: number;
  /** Cash + what is owed to you − what you owe, as of the end of this month. Equals `closingNetWorth`. */
  netWorth: number;
  /** Close of the previous month. `openingCash + netCashThisMonth === closingCash`. */
  openingCash: number;
  closingCash: number;
  /** Close of the previous month. `openingNetWorth + savingsThisMonth === closingNetWorth`. */
  openingNetWorth: number;
  closingNetWorth: number;
  netCashThisMonth: number;

  monthlyIncome: number;
  totalExpenses: number;
  /** Income − spending this month. Signed: negative means the month is overspent. Never clamped. */
  savingsThisMonth: number;
  /** @deprecated Use `savingsThisMonth`. The backend keeps sending it for older installed builds. */
  remainingBalance: number;
  plannedSavings: number;
  rolloverSavings: number;
  totalBudgeted: number;

  dailyAllowance: number;
  daysRemaining: number;
  daysInMonth: number;
  monthProgressPercentage: number;
  spentPercentage: number;
  pacingStatus: "On Track" | "Pacing Fast" | "Over Budget";

  needsTotal: number;
  wantsTotal: number;
  needsPercentage: number;
  wantsPercentage: number;

  netDebtSnapshot: NetDebtSnapshot;
  upcomingObligations: UpcomingObligation[];

  categoryBreakdown: CategoryBreakdownItem[];
  budgetVsActual: BudgetVsActualItem[];
  trend: TrendPoint[];
}

export type LoanType = "LENT" | "BORROWED";
export type LoanStatus = "PENDING" | "PARTIAL" | "SETTLED";

export interface Loan {
  id: string;
  userId: string;
  type: LoanType;
  personName: string;
  amount: number;
  settledAmount: number;
  /** Server-computed: amount - settledAmount, floored at zero. */
  remainingAmount?: number;
  dueDate: string | null; // ISO string
  status: LoanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanInput {
  type: LoanType;
  personName: string;
  amount: number;
  dueDate?: string | null;
  notes?: string | null;
  /**
   * Whether the principal moves now. Defaults to true server-side. False records a debt that
   * predates the app without fabricating a cash movement today.
   */
  recordCashflow?: boolean;
}

export interface LoansSummary {
  totalLentPending: number;
  totalBorrowedPending: number;
  netBalance: number;
  totalLentOverall: number;
  totalBorrowedOverall: number;
  activeLentCount: number;
  activeBorrowedCount: number;
  totalActiveCount: number;
}


// --- Unified ledger -------------------------------------------------------------------------

/**
 * What a movement of money *is*.
 *
 * Cash on hand sums every kind. Spending analytics read SPEND only, so lending a large sum no
 * longer counts against a budget — a transfer is not an expense.
 *
 *   SPEND      cash out, counts as spending
 *   EARN       cash in,  counts as income
 *   LEND_OUT   cash out, loan-linked
 *   COLLECT    cash in,  loan-linked
 *   BORROW_IN  cash in,  loan-linked
 *   REPAY      cash out, loan-linked
 */
export type TransactionKind = "SPEND" | "EARN" | "LEND_OUT" | "COLLECT" | "BORROW_IN" | "REPAY";

/** Kinds a user creates directly; the rest are written by the loan lifecycle. */
export const MANUAL_KINDS: TransactionKind[] = ["SPEND", "EARN"];
export const LOAN_KINDS: TransactionKind[] = ["LEND_OUT", "COLLECT", "BORROW_IN", "REPAY"];

/** Which direction each kind moves cash. */
export const CASH_SIGN: Record<TransactionKind, 1 | -1> = {
  SPEND: -1,
  EARN: 1,
  LEND_OUT: -1,
  COLLECT: 1,
  BORROW_IN: 1,
  REPAY: -1,
};

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  date: string; // ISO instant
  month: string; // "YYYY-MM", derived in the user's timezone by the server
  description: string | null;
  paymentMethod: string;

  // SPEND only
  categoryId: string | null;
  category: Category | null;
  needWant: NeedWant | null;

  // EARN only
  source: string | null;
  sourceIcon: string | null;
  sourceColor: string | null;

  /** Set for loan-linked kinds. Such rows are managed by the loan, not edited directly. */
  loanId: string | null;
  createdAt: string;
}

export interface TransactionInput {
  kind: "SPEND" | "EARN";
  amount: number;
  date: string;
  description?: string;
  paymentMethod?: string;
  categoryId?: string;
  needWant?: NeedWant;
  source?: string;
  sourceIcon?: string;
  sourceColor?: string;
}
