# Core Rules — Expenso Mobile

1. **Understand before building**: Read `.agents/AGENTS.md` and `.agents/design-system.md` before making UI changes.
2. **Layer boundaries**:
   - `src/api/`: Raw Axios network calls and request parameter typing.
   - `src/hooks/`: React state management, loading flags, error handling, and mutation functions.
   - `src/screens/`: Pure presentation. Never call `axios` directly from inside screen components.
3. **Design System First**: Never invent new colors or ad-hoc margins. Use tokens from `src/theme/` and `.agents/design-system.md`.
4. **Verification**: Always run `npm run typecheck` (`tsc --noEmit`) before completing any step.
