# Expenso Mobile UI/UX Design System

## Design Philosophy
Expenso employs a "Premium Indigo FinTech" visual language. It is **vibrant, modern, high-end, and highly readable**.
Whitespace is intentional. Simplicity is a core feature, but accents are bold and energetic to inspire financial confidence.

## Colors
We use a high-contrast dark navy theme with vibrant indigo/emerald accents:
- **Background**: `#0B0F19` (Deep Slate/Navy)
- **Surfaces**: `#111827` (Base), `#1F2937` (Raised)
- **Borders**: `#374151` (Solid), `rgba(255, 255, 255, 0.08)` (Light/Translucent)
- **Text**: `#F9FAFB` (Primary), `#9CA3AF` (Secondary), `#6B7280` (Muted)
- **Primary Accent**: `#6366F1` (Electric Indigo) with `#FFFFFF` foreground.
- **Alerts/Semantic**: `#EF4444` (Danger), `#F59E0B` (Warning), `#10B981` (Success). Use muted variants (`rgba(..., 0.15)`) for backgrounds.
- **Accent text** `accentText`: `#818CF8`, for accent-coloured *text* (links, text buttons, the snackbar action). `accent` `#6366F1` as text is only 4.29 / 3.97 / 3.29:1 on background / surface / surfaceRaised. `#818CF8` is 6.42 / 5.95 / 4.92:1. Keep `accent` for fills (FAB, primary button, selected borders).
- **Shadow** `shadow`: `#000000`, used only as `shadowColor` through `elevation.floating`.
- **Contrast rule**: `textMuted` (3.0–4.0:1 on our surfaces) is for disabled and decorative content only, never readable text. Use `textSecondary` (≥ 5.78:1).

_`accentText`, `shadow`, `size.*` and `elevation.floating` are specified in `docs/DESIGN.md` (next phase). Add them to `src/theme/` in T1.4 / T2.0._

## Typography
A single, clean font family is used with a strict hierarchy for maximum readability:
- **Display**: 38pt, ExtraBold (800), tracking -0.5
- **MetricValue**: 32pt, ExtraBold (800), tracking -0.3
- **Title**: 28pt, Bold (700), tracking -0.3
- **Subtitle**: 20pt, SemiBold (600)
- **Body**: 17pt, Medium (500)
- **Caption**: 15pt, Medium (500)
- **Small**: 14pt, SemiBold (600)

## Spacing & Sizing
Generous, breathable 4/8pt-based spacing system:
- `xs: 6px`
- `sm: 10px`
- `md: 16px`
- `lg: 20px` (Default horizontal screen padding)
- `xl: 28px`
- `xxl: 40px`

Sizes (`size`, in `src/theme/spacing.ts`):
- `minTouch: 44`: minimum hit area for anything tappable
- `fab: 56`: floating action button diameter

Elevation (`elevation`, in `src/theme/elevation.ts`): one scale, no per-component shadows.
- `floating`: `{ elevation: 6, shadowColor: colors.shadow, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }`. For the FAB and the snackbar.

## Component Guidelines
- **Touch Targets**: Minimum 44x44pt. Standard buttons and inputs are 54-56pt tall.
- **Buttons**: Full width, heavily rounded (`14px`), bold label (16pt, 700). Primary button is Electric Indigo with white text.
- **Inputs**: Solid borders (`#374151`), muted text placeholder, 56pt height.
- **Cards/Surfaces**: Minimal borders, `14px` or `20px` radius, strictly used to group dense related data, not as decorative wrappers.
- **Loading States**: Use pulsing shimmer skeletons matching the content's final shape. Avoid generic spinners for main content.
- **Empty States**: Centered icon (muted, 48pt), title (17pt, 600, secondary text), subtitle (15pt, secondary text). Avoid verbose phrasing.
- **Tab bar**: exactly 3 tabs (Home · Activity · Budget), with no `+` slot (D-11). The dock height comes from one shared function, used by both the bar and the FAB.
- **Floating action button (quick add)**: diameter `size.fab`, circle, `accent` fill, 24pt `plus` icon in `accentForeground`, `elevation.floating`.
  - Position: `right = spacing.lg + insets.right`, `bottom = dockHeight + spacing.md`. The dock height already includes the bottom inset. No pixel literals.
  - Rendered by `TabNavigator` as an absolute sibling of the navigator inside a full-screen `View`, so its whole hit area is inside its parent. It shows on the 3 tab screens only.
  - Pressed state: opacity 0.85. `hapticMedium` on press. Label "Add a transaction", role button. Opens `QuickActionSheet`.
- **Snackbar (global, one at a time)**: `surfaceRaised`, 1pt `border`, `radius.md`, `elevation.floating`.
  - Position: `left = right = spacing.lg`, `bottom = dockHeight + spacing.md + size.fab + spacing.sm`, always above the FAB. Only shown over tab screens.
  - Message: `caption` in `textPrimary`. Action: text button in `accentText`, ≥ `size.minTouch`.
  - When `fontScale ≥ 1.3`, the action stacks below the message.
  - Durations, queueing and lifecycle are in `docs/DESIGN.md` §S3.

## Mobile-First Rules
- Honor safe areas (status bar, bottom home indicator).
- Key actions must be thumb-reachable.
- Keyboard dismissal and `KeyboardAvoidingView` are mandatory on forms.
- Data presentation should adapt to device width without horizontal overflow.
- Tab-screen scroll views use `useTabBarPadding()` for their bottom padding, never a literal. It returns `dockHeight + spacing.md + size.fab + spacing.md`, so the last row scrolls fully clear of both the dock and the FAB. Stack screens (Settings, Loans, forms) use `useSafeAreaInsets()`, because `useBottomTabBarHeight()` throws outside the tab navigator.
