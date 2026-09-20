import { NavigatorScreenParams } from "@react-navigation/native";
import { Category, Expense, Income, LoanType } from "./models";

export type AuthStackParamList = {
  Login: undefined;
  Register?: undefined;
};

export type TabParamList = {
  Home: undefined;
  Activity: { filter?: "ALL" | "EXPENSES" | "INCOME" | "LOANS"; highlightId?: string } | undefined;
  QuickAdd: undefined;
  Budget: { openCategoryId?: string } | undefined;
  Loans: undefined;
  // Backwards compatibility
  Expenses?: { highlightId?: string; deleteId?: string } | undefined;
  Income?: { highlightId?: string; deleteId?: string } | undefined;
  Settings?: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Tabs: NavigatorScreenParams<TabParamList>;
  Settings: undefined;
  ExpenseForm: { expense?: Expense } | undefined;
  IncomeForm: { income?: Income } | undefined;
  Categories: { highlightId?: string; deleteId?: string } | undefined;
  CategoryForm: { category?: Category } | undefined;
  Loans: undefined;
  LoanForm: { initialType?: LoanType } | undefined;
  OnboardingTour: { fromSettings?: boolean } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
