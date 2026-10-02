// These mirror the backend's response shapes exactly. Keeping them in one
// file means the API layer, hooks, and screens all agree on what an
// "Expense" or "Category" looks like without guessing.

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  avatarUrl?: string | null;
  /** ISO time the account was created. Missing from older servers. */
  createdAt?: string | null;
  /** Whether the account has a password (Google-only accounts don't). Missing from older servers. */
  hasPassword?: boolean;
  /** The user's cash before their first entry (R-34). Null until set. Missing from older servers. */
  openingBalance?: number | null;
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
  /** Of the totals above, what has been paid back in later months (absent from older servers). */
  lentRepaidSince?: number;
  borrowedRepaidSince?: number;
}

export interface UpcomingObligation {
  id: string;
  type: LoanType;
  personName: string;
  remainingAmount: number;
  dueDate: string;
  isOverdue: boolean;
}

export type MonthPeriod = "past" | "current" | "future";

export interface CashAvailable {
  amount: number;
  period: MonthPeriod;
  /** Null until the user sets it; Home then asks for it (R-34). */
  openingBalance: number | null;
  /** This month's story: startOfMonth + income + borrowed + collected − expenses − lent − repaid. */
  breakdown: {
    startOfMonth: number;
    income: number;
    expenses: number;
    lent: number;
    borrowed: number;
    collected: number;
    repaid: number;
  };
}

export interface SpendingComparison {
  currentTotal: number;
  currentByCategory: { categoryId: string; amount: number }[];
  previousTotal: number;
  previousByCategory: { categoryId: string; amount: number }[];
  /** The day both sides stop at, for the current month; null for a past month. */
  toDay: number | null;
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

  /** Home's hero (R-35): today's cash for the current month, the month-end cash otherwise. */
  cashAvailable: CashAvailable;
  /** This month's spending against the previous month's, same-day for the current month (R-39). */
  comparison: SpendingComparison | null;
  /** Spending dated today (user's timezone); null for other months, absent from older servers. */
  spentToday?: number | null;
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
  /** When the money moved (D-62). Missing from older servers and cached payloads: use `loanDate()`. */
  date?: string;
  /** Present on the month view (`GET /loans?month`): the loan as of that month's end. */
  /**
   * The loan as of the month's end (R-41). `repaidSince` and `settledOn` say what happened after it
   * (absent from older servers): a past month shows the later payback instead of looking stale.
   */
  asOf?: {
    settledAmount: number;
    remainingAmount: number;
    status: LoanStatus;
    repaidSince?: number;
    settledOn?: string | null;
  };
  /**
   * Whether the money went out of (or came into) the user's cash when the loan started. False for
   * an old debt and for an expense someone else paid. Absent from older servers.
   */
  cashMoved?: boolean;
  /** The expense this loan came from (someone else paid it, or it was split). */
  expense?: LoanExpense | null;
  /** Repayments, oldest first. `movesCash` false = settled without money (forgiven, in kind). */
  payments?: LoanPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  movesCash: boolean;
}

export interface LoanExpense {
  id: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  /** The user's own share: what counts as spending. */
  amount: number;
  date: string;
  month: string;
  paymentMethod: string;
  needWant: NeedWant | null;
  movesCash: boolean;
}

/** Options for a repayment. */
export interface PaymentOptions {
  /** When it was paid: an ISO date-time. Defaults to now on the server. */
  date?: string;
  /** False = no money changed hands (forgiven, paid in kind). */
  movesCash?: boolean;
}

export interface LoanInput {
  type: LoanType;
  personName: string;
  amount: number;
  dueDate?: string | null;
  /**
   * Whether the principal moves now. Defaults to true server-side. False records a debt that
   * predates the app without fabricating a cash movement today.
   */
  recordCashflow?: boolean;
  /** When the money moved: an ISO date-time, never in the future (D-63). */
  date?: string;
}

/** A loan's own date, falling back to when it was recorded for older payloads (R-42). */
export function loanDate(loan: Pick<Loan, "date" | "createdAt">): string {
  return loan.date ?? loan.createdAt;
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
 *   ADJUST     a balance correction: signed amount, neither income nor spending
 *
 * A row with `movesCash` false didn't change cash (an expense someone else paid, an old debt, a
 * loan settled without money). It still counts as spending, income or debt as its kind says.
 */
export type TransactionKind = "SPEND" | "EARN" | "LEND_OUT" | "COLLECT" | "BORROW_IN" | "REPAY" | "ADJUST";

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
  ADJUST: 1,
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

  /**
   * Set for loan-linked kinds, which are managed by the loan, and for an expense that carries a loan
   * (`paidBy` / `split`), which is edited as an expense.
   */
  loanId: string | null;
  /** False when the user's cash didn't change. Absent from older servers (= true). */
  movesCash?: boolean;
  /** An expense someone else paid: the user owes them `amount`. */
  paidBy?: { personName: string } | null;
  /** An expense the user paid in full and split: `share` is theirs, owed to the user. */
  split?: { personName: string; share: number } | null;
  /** For a loan movement: the person on the other side. */
  personName?: string | null;
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
  /** SPEND only. `amount` is always the user's own share. Null clears it on an edit. */
  paidBy?: { personName: string } | null;
  split?: { personName: string; share: number } | null;
}
