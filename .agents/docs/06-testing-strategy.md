# Testing Strategy — Expenso Mobile

## Static Quality Gate
- `npm run typecheck` (`tsc --noEmit`) must report **0 errors** before any commit or PR.

## Device & Manual Testing
Before releasing an update:
1. **Responsive Widths**: Test on compact screens (e.g. 360px wide Android) and standard devices. Confirm no text truncation or horizontal overflow.
2. **Safe Area Insets**: Confirm that top status bars and bottom navigation indicators never clip content.
3. **Form Submissions**: Test keyboard popup behavior and dismissals on `AddExpenseModal` and `SetBudgetModal`.
4. **Offline Resilience**: Verify network error toasts appear when API server is unreachable.
