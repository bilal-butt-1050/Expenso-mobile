# Coding Conventions & Patterns — Expenso Mobile

## Component & Styling Conventions
1. **Design Tokens**:
   - Always import theme tokens from `src/theme/`:
     - `colors.background` (`#0B0F19`)
     - `colors.primary` (`#6366F1`)
     - `colors.surface` (`#111827`)
     - `colors.surfaceRaised` (`#1F2937`)
     - `colors.border` (`#374151`)
   - Never write arbitrary inline hex values.
2. **Bottom Padding on Scroll Views**:
   - Because the bottom tab navigation bar uses an elevated floating pill layout (`position: 'absolute'`), all scrollable screens MUST include:
     ```typescript
     contentContainerStyle={{ paddingBottom: 140 }}
     ```
   - This ensures content can be scrolled cleanly above the dock.
3. **Touch Targets**:
   - Minimum 44x44pt on all buttons, icon triggers, and list rows.
4. **Haptics**:
   - Trigger light haptic feedback on status toggling and form submissions:
     ```typescript
     import * as Haptics from 'expo-haptics';
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     ```
5. **Loading & Empty States**:
   - Use `Skeleton` shimmer placeholders during data fetching.
   - Use centered empty state cards when lists have zero items.
