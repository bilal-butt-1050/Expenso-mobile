import { NavigatorScreenParams } from "@react-navigation/native";
import { Category, Expense, Income } from "./models";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Home: undefined;
  Expenses: undefined;
  Income: undefined;
  Budget: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Tabs: NavigatorScreenParams<TabParamList>;
  ExpenseForm: { expense?: Expense } | undefined;
  IncomeForm: { income?: Income } | undefined;
  Categories: undefined;
  CategoryForm: { category?: Category } | undefined;
  Income: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
