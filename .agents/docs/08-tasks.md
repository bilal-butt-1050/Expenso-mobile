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

## "Feel Like Home" Minimalist Redesign & Decluttering
**Goal:** Make the app feel cozy, uncluttered, and comfortable, with proper safe areas, minimal cognitive load, and zero gesture collisions.

**Acceptance criteria:**
- [x] QuickActionSheet: safe area insets respected (`paddingBottom: insets.bottom + ...`), no gesture bar collision, stripped noisy descriptions.
- [x] HomeScreen: removed redundant floating action pills, warm personalized greeting, serene hero balance, unified monthly cashflow card, calm alerts.
- [x] ActivityScreen: removed 10-category chip carousel and 3-box summary card, quiet minimalist segmented controls, Apple-Wallet-style calm transaction feed.
- [x] Safe area tab bar clearance: all scrollable lists have `paddingBottom: 140` to avoid clipping.
- [x] 0 TypeScript compiler errors.
- [x] EAS preview update published.

## Consolidate Obligations & 4-Tab Navigation
**Goal:** Consolidate duplicate debt and liability logic so expenses represent strictly settled cashflows, all deferred obligations (debts, loans) live under a unified model, and navigation is streamlined to 4 intuitive tabs (Home, Activity, [+], Budgets).

**Acceptance criteria:**
- [x] Data Model & Domain Consistency: Expenses strictly represent settled cashflows ("Paid"); "Unpaid" removed from expense schema, API filters, and forms.
- [x] Obligation Settlement Sync: Settling a loan in backend transaction automatically creates corresponding cashflow records (Expense for borrowed repayment, Income for lent collection).
- [x] Streamlined 4-Tab Navigation: Bottom tab bar has exactly 4 visible tabs (`Home`, `Activity`, `[+] FAB`, `Budget`), with `Loans` folded cleanly into Home/Activity.
- [x] Two-Tier Action Sheet: [+] FAB opens clean selection between settled cashflow (`Expense`, `Income`) and deferred counterparty items (`Lend Money`, `Borrow Money`) with generous safe area padding.
- [x] Safe Area & Gesture Ergonomics: QuickActionSheet cancel button and sheet container have generous bottom insets preventing Android/iOS gesture bar collisions.
- [x] Automated Verification: `npm run typecheck` passes with 0 errors across both mobile and backend.

## UI Polish, Micro-Interactions & Activity Hub Consolidation
**Goal:** Perfect app micro-interactions, fold loan management into Activity, declutter Home & Budgets with primary progress animations, and overhaul Onboarding Tour.

**Acceptance criteria:**
- [x] 1. Activity Segmented Control: Spring bounce clamped to container borders without edge overflow.
- [x] 2. Activity Hub & Loans: Loans dashboard integrated directly into Activity tab (with top capsule & settlement action); Loans row removed from Settings and standalone screen removed.
- [x] 3. Swipe-to-Delete & Highlights: All items (Expenses, Income, Loans) in Activity support highlight glow on add, and swipe-to-delete with red background and confirmation dialog.
- [x] 4. Pixel-Perfect QuickActionSheet: Fluid opening/closing spring transitions and interactive handle drag-down dismiss.
- [x] 5. Home Dashboard Stats: Display safe daily allowance, monthly cashflow, and recent activity in clean, non-overwhelming cards.
- [x] 6. Budget Progress Bars: Primary theme color, smooth 0-to-target entrance animation, interactive tap detail, and decluttered layout.
- [x] 7. Onboarding Tour Overhaul: Modern SVG artwork, 1-2 line crisp capsules, and automatic trigger on first login for new users.
- [x] 8. Haptic Feedback Discipline: Meaningful, delicate haptic cues for record creation, heavy mechanical feedback for deletion, no noise.
- [x] 9. Verification: `npm run typecheck` passes with 0 errors and EAS preview update published (`dca8e984-3c8f-41fb-b461-b5cb1df59a0e`).

## Bubbly & Comfy UI Overhaul, Left-to-Right Swipe Delete & Clean Activity Hub
**Goal:** Deliver a bubbly, friendly, cozy UI experience devoid of corporate stiffness, with left-to-right swipe-to-delete, title-only records, and no search input in Activity.

**Acceptance criteria:**
- [x] 1. Left-to-Right Swipe Delete: Records swipe from left to right with a bubbly red action capsule and smooth slide-off exit animation.
- [x] 2. Title-Only Records: Removed descriptions and subtitle clutter across all records (expenses, income, loans); records feature only clean titles and amounts.
- [x] 3. Activity Search Removal: Eliminated search bar and text filtering in the Activity tab to keep it minimal, fast, and cozy.
- [x] 4. Bubbly Geometry & Aesthetic: Rounded pill segmented control, soft pastel icon bubbles, and comfortable padding.
- [x] 5. Verification: `npm run typecheck` passes with 0 errors and EAS preview update published (`0e372ffc-8d9f-4aac-97df-585cb4de42c3`).


