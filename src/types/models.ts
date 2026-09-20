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

export interface DashboardSummary {
  month: string;
  plannedSavings: number;
  rolloverSavings: number;
  monthlyIncome: number;

  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses?: number;
  remainingBalance: number;
  cashInHand?: number;
  projectedBalance: number;
  savingsAllTime: number;
  savingsPercentage: number;
  dailyAllowance?: number;
  daysRemaining?: number;
  daysInMonth?: number;
  needsTotal?: number;
  wantsTotal?: number;
  needsPercentage?: number;
  wantsPercentage?: number;
  monthProgressPercentage?: number;
  spentPercentage?: number;
  pacingStatus?: "On Track" | "Pacing Fast" | "Over Budget";
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

