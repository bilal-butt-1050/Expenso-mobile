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

## Component Guidelines
- **Touch Targets**: Minimum 44x44pt. Standard buttons and inputs are 54-56pt tall.
- **Buttons**: Full width, heavily rounded (`14px`), bold label (16pt, 700). Primary button is Electric Indigo with white text.
- **Inputs**: Solid borders (`#374151`), muted text placeholder, 56pt height.
- **Cards/Surfaces**: Minimal borders, `14px` or `20px` radius, strictly used to group dense related data, not as decorative wrappers.
- **Loading States**: Use pulsing shimmer skeletons matching the content's final shape. Avoid generic spinners for main content.
- **Empty States**: Centered icon (muted, 48pt), title (17pt, 600, secondary text), subtitle (15pt, muted). Avoid verbose phrasing.

## Mobile-First Rules
- Honor safe areas (status bar, bottom home indicator).
- Key actions must be thumb-reachable.
- Keyboard dismissal and `KeyboardAvoidingView` are mandatory on forms.
- Data presentation should adapt to device width without horizontal overflow.
- All scroll views must include `paddingBottom: 140` so content can be scrolled above the elevated bottom dock.
