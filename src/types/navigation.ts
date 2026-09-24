import { NavigatorScreenParams } from "@react-navigation/native";
import { Category, Loan, LoanType, Transaction } from "./models";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ActivityFilter = "ALL" | "EXPENSES" | "INCOME" | "LOANS";

/**
 * Exactly four tabs: Home, Activity, the [+] action, and Budget.
 *
 * Everything else reached from a tab is a stack screen. Settings used to be both a fifth tab and a
 * root screen — two live instances of the same component with independent state, and the avatar in
 * the header resolved to the tab one, leaving the root registration unreachable. There were also
 * three hidden tabs (`Loans`, `Expenses`, `Income`) with no route into them.
 */
export type TabParamList = {
  Home: undefined;
  Activity: { filter?: ActivityFilter; highlightId?: string } | undefined;
  /** Renders nothing — the tab button opens the quick-action sheet. */
  QuickAdd: undefined;
  Budget: { openCategoryId?: string } | undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Tabs: NavigatorScreenParams<TabParamList>;
  Settings: undefined;
  /** Full debt management. Deep-linked from Home's "Debts & Loans" card. */
  Loans: undefined;
  /** `loan` present means edit; absent means create. */
  LoanForm: { initialType?: LoanType; loan?: Loan } | undefined;
  /** `transaction` present means edit; absent means create. */
  ExpenseForm: { transaction?: Transaction } | undefined;
  IncomeForm: { transaction?: Transaction } | undefined;
  Categories: undefined;
  CategoryForm: { category?: Category } | undefined;
  OnboardingTour: { fromSettings?: boolean } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
