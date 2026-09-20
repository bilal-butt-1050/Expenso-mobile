# Tasks — Expenso Mobile

Live task plan for active work on the mobile app. Update checkboxes as steps are implemented and verified.

## Feature Architecture, Animation Polish & Feature Expansion
**Goal:** Restructure the mobile navigation and feature flow into a cohesive, connected financial hub with fluid Reanimated animations, unified activity tracking, and intelligent cashflow connections.

**Acceptance criteria:**
- [x] Unified Transactions/Activity screen replacing separate Expenses & Income tabs with instant segment switching (`All`, `Expenses`, `Income`, `Loans`), live search, and filter chips.
- [x] Center Quick-Action button with spring-animated Action Sheet / Speed Dial (`Add Expense`, `Log Income`, `Record Loan`).
- [x] 50/30/20 Rule & Need vs Want analytics widget using existing expense classification data.
- [x] Connected Loans architecture: Home Action Center overdue alerts, Net Debt summary, and optional auto-logging of loan settlements to cashflow.
- [x] Fluid micro-interactions: `AnimatedProgressBar` spring interpolation, smooth tab transitions, and animated number transitions.
- [x] 0 TypeScript errors (`npm run typecheck`).
- [x] Local verification & EAS preview update.

### Steps
- [x] 1. **Scout & Components Setup**: Build reusable Reanimated micro-components (`AnimatedProgressBar`, `AnimatedSegmentedControl`, `QuickActionSheet`). — verify: unit render & typecheck
- [x] 2. **Navigation Restructuring**: Upgrade `TabNavigator.tsx` to modern 5-tab architecture (`Home`, `Activity`, `QuickAdd`, `Budget`, `Loans` / `Settings`), keeping backwards-compatible route aliases. — verify: smooth tab transitions & tab bar clearing
- [x] 3. **Unified Activity Hub**: Implement `ActivityScreen` combining expenses, incomes, and loan events with date grouping, search, and category filter chips. — verify: filter toggle & instant search
- [x] 4. **Financial Health & 50/30/20 Analytics**: Add Need vs Want breakdown card to Budget/Home screens using real user expense data. — verify: calculation accuracy & animated donut/bar
- [x] 5. **Loans & Dashboard Integration**: Connect loan alerts to Home Action Center, add Net Debt position widget, and wire loan settlement cashflow hooks. — verify: debt balance & settle flow
- [x] 6. **Animation & Transition Polish**: Polish screen entrance transitions, number tickers, and haptic feedback across all main interactions. — verify: 60fps animations on device
- [x] 7. **Quality Gate & Verification**: Run typecheck, linting, and publish EAS update for user testing. — verify: `npm run typecheck` passes with 0 errors
