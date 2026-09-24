# Expenso Mobile

React Native client for Expenso — expense, income, budget and debt tracking.
Expo SDK 57 · React Native 0.86 · TypeScript.

Paired with the `Expenso-backend` repo. They are separate repos and must stay API-compatible;
a breaking change needs both sides shipped together.

## Run it

```bash
cp .env.example .env     # EXPO_PUBLIC_API_URL
npm install
npm run start            # Metro
npm run android          # connected device / emulator
npm run typecheck        # tsc --noEmit — must be 0 errors before any commit
```

## Layout

```
src/
  api/          axios calls, one module per resource. No React in here.
  hooks/        data fetching, mutations, loading/error state
  screens/      presentation only
  components/   shared UI primitives
  navigation/   navigators and param lists
  theme/        colors, spacing, typography tokens
  utils/        pure helpers (currency, date, haptics)
  types/        domain models mirroring backend responses
```

**Layer rule:** screens call hooks, hooks call `api/`. A screen must never import `axios` or
`apiClient` directly.

## Non-negotiables

1. **Never commit to `main`.** Branch per task: `feat/`, `fix/`, `refactor/`, `chore/`.
2. **`npm run typecheck` passes with 0 errors** before every commit.
3. **No `any`.** API responses, props and route params are all typed. There is currently no
   linter — `npm run lint` was removed because ESLint was never installed and no config existed,
   so the gate it implied was fiction. Reinstating it properly is tracked in the plan.
4. **Design system is the authority** — see [docs/design-system.md](docs/design-system.md). Never
   invent colours or ad-hoc spacing; use `src/theme/` tokens.
5. **Touch targets ≥ 44×44pt.** Buttons and inputs are 54–56pt tall.
6. **Scroll containers must clear the elevated tab dock** — use `useTabBarPadding()`. Never a
   hardcoded pixel value; the dock's height depends on the device's safe-area inset. Screens
   outside the tab navigator (Settings, Loans) use `useSafeAreaInsets()` instead, because
   `useBottomTabBarHeight()` throws where there is no tab bar.
7. **Forms** use `KeyboardAvoidingView` and dismiss the keyboard on tap-outside.
8. **Loading and empty states are required**, not optional — skeletons matching final content shape,
   and concise empty states.

## Security

- JWTs live in `expo-secure-store` (Keychain / Keystore). `AsyncStorage` is for non-sensitive UI state
  only, and every cache key must be namespaced by user id.
- No hardcoded secrets. URLs and public client ids come from `expo-constants` / `.env`.
- Logout clears the token **and** every cached query and queued mutation.

## Release flow

Preview and production are separate EAS channels, and the two apps are installed side by side
(`com.expenso.app.preview` / `com.expenso.app`).

| Step | Command |
|---|---|
| Preview OTA | `npm run update:preview` |
| Production OTA | `npm run update:prod` |

**Production is never published without explicit approval.** The flow is: push branch → preview OTA →
manual testing on device → PR to `main` → review → merge → production OTA on request.

## Current work

Architecture is mid-overhaul. See `../IMPLEMENTATION_PLAN.md` (outside both repos) for the batch plan
and the decisions behind it — in particular the move to a unified `Transaction` ledger, TanStack Query,
and React Navigation 7.
