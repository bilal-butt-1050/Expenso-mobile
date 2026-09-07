// These mirror the backend's response shapes exactly. Keeping them in one
// file means the API layer, hooks, and screens all agree on what an
// "Expense" or "Category" looks like without guessing.

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  savingsGoal: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export type PaymentMethod = "Cash" | "Bank" | "Card" | "Easypaisa" | "JazzCash";
export type NeedWant = "Need" | "Want";
export type ExpenseStatus = "Paid" | "Unpaid";

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
  status: ExpenseStatus;
}

export interface ExpenseInput {
  categoryId: string;
  date: string;
  description?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  needWant: NeedWant;
  status: ExpenseStatus;
}

export interface Income {
  id: string;
  month: string;
  salary: number;
  bonus: number;
  otherIncome: number;
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
  unpaid: number;
  remaining: number;
  status: "On Track" | "Over Budget";
}

export interface TrendPoint {
  month: string;
  totalExpenses: number;
}

export interface DashboardSummary {
  month: string;
  monthlyIncome: number;
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
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
