# Data Model & Types — Expenso Mobile

Located in `src/types/index.ts`. Matches backend Prisma entity structures.

## Core Interfaces

### `Expense`
```typescript
interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  date: string;
  month: string; // "YYYY-MM"
  description?: string;
  amount: number;
  paymentMethod: string;
  needWant: 'Need' | 'Want';
  status: 'Paid' | 'Unpaid';
  createdAt: string;
}
```

### `Category`
```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}
```

### `Budget`
```typescript
interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  spent: number;
  percentage: number;
  month: string;
}
```

### `Loan`
```typescript
interface Loan {
  id: string;
  type: 'LENT' | 'BORROWED';
  personName: string;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: 'PENDING' | 'PARTIAL' | 'SETTLED';
  notes?: string;
}
```

### `DashboardSummary`
```typescript
interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  currentBalance: number;
  projectedBalance: number;
  categoryBreakdown: Array<{ name: string; amount: number; color: string; icon: string }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
}
```
