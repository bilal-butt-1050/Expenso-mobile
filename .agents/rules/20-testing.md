# Testing & Verification Standards — Expenso Mobile

1. **Static Quality Gate**:
   - `npm run typecheck` (`tsc --noEmit`) must exit with **0 errors**.
2. **Device Verification**:
   - Verify that changes render cleanly without horizontal layout overflows on varied device widths.
   - Verify safe area compliance (status bar notch and bottom home indicator).
3. **Bug Reproduction**:
   - When fixing a UI or state bug, trace the issue in the custom hook or API client rather than patching symptoms with hacky `useEffect` timers.
