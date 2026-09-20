# Architecture — Expenso Mobile

## Client Architecture & Data Flow

```
[ UI Screen Component (e.g. ExpensesScreen) ]
             │ (Invokes hook)
             ▼
[ Custom Hook (e.g. useExpenses) ]
             │ (Dispatches HTTP request)
             ▼
[ API Client (src/api/expenses.ts) ]
             │ (Axios with Bearer Token)
             ▼
[ Expenso Backend API (:4000) ]
```

## Layer Definitions
1. `src/screens/`: Presentation-only components. Renders state provided by hooks. Handles UI animations, gestures, and navigation transitions.
2. `src/hooks/`: Houses business state, cached queries, mutation triggers (`addExpense`, `toggleStatus`), and refresh handlers.
3. `src/api/`: Typed functions making HTTP calls via an Axios instance that injects JWT tokens from `SecureStore`.
4. `src/navigation/`: Configures React Navigation `BottomTabNavigator` with custom dock styling (`position: 'absolute'`, elevated pill).
5. `src/theme/`: Centralized theme tokens: `colors`, `spacing`, `typography`, `borderRadius`.
