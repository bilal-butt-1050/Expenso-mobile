# API Contracts & Client Methods — Expenso Mobile

Configured in `src/api/` with base Axios instance `src/api/client.ts`.
Automatically attaches header: `Authorization: Bearer <token>` from `SecureStore`.

## API Modules
1. `src/api/auth.ts`: `login()`, `register()`, `googleLogin()`, `sendOtp()`, `verifyOtp()`, `getMe()`.
2. `src/api/expenses.ts`:
   - `getExpenses(month?, status?, categoryId?)`: Fetches expense list.
   - `createExpense(data)`: Posts new expense.
   - `toggleExpenseStatus(id)`: Flips Paid <-> Unpaid.
   - `deleteExpense(id)`: Deletes expense.
3. `src/api/categories.ts`: `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`.
4. `src/api/income.ts`: `getIncome(month)`, `createIncome(data)`, `deleteIncome(id)`.
5. `src/api/budgets.ts`: `getBudgets(month)`, `setBudget(data)`, `deleteBudget(id)`.
6. `src/api/loans.ts`: `getLoans(type?, status?)`, `createLoan(data)`, `settleLoan(id, amount)`, `deleteLoan(id)`.
7. `src/api/dashboard.ts`: `getDashboard(month)`.
