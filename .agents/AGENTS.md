# AGENTS.md — Expenso Mobile Application

Entry point for every agent working in the `expenso-mobile` repository. Read this first, then the docs it links.
Keep it accurate: if it contradicts the code, fix it in the same PR.

## What this is
The mobile client for Expenso. Built with React Native 0.86, Expo SDK 57, and TypeScript. Implements the "Premium Indigo FinTech" dark theme (`#0B0F19` with Electric Indigo `#6366F1` accents). Delivers fast one-tap expense logging with paid/unpaid toggles, category budgets, debt management, and a real-time dashboard.

## Stack
| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo SDK 57 / React Native 0.86 | Managed workflow with prebuild & dev-client |
| Language | TypeScript 7.0 | Strict typing, zero `any` |
| UI & Icons | Custom Design System + RN SVG + Vector Icons | Electric Indigo theme, MaterialCommunityIcons |
| Navigation | React Navigation 6 | Bottom tabs with elevated floating dock + native stacks |
| Storage & Auth | Expo SecureStore & AsyncStorage | Secure JWT persistence |
| Networking | Axios 1.7 | Auth interceptors & typed response handlers |
| Distribution | EAS Build & EAS Update | Preview channel for testing, production channel for releases |

## Run it
```bash
cp .env.example .env     # configure API base URL (e.g. http://localhost:4000)
npm install
npm run start            # starts Metro bundler
npm run android          # opens on connected Android device / emulator
npm run ios              # opens on iOS simulator
```

## Scripts (use these exact commands — CI runs the same ones)
| Purpose | Command |
|---|---|
| start | `npm run start` |
| android | `npm run android` |
| ios | `npm run ios` |
| typecheck | `npm run typecheck` (`tsc --noEmit`) |
| lint | `npm run lint` |
| preview OTA | `npx eas-cli update --branch preview --environment preview --message "<msg>" --non-interactive` |
| production OTA | `npx eas-cli update --branch production --environment production --message "<msg>" --non-interactive` |

## Structure
```
mobile/
├── assets/              # Fonts, splash screens, app icons
├── src/
│   ├── api/             # Typed API client calls (auth, expenses, etc.)
│   ├── components/      # Design system components (Button, TextField, Skeleton, Card)
│   ├── hooks/           # Custom data hooks (useExpenses, useDashboard, useAuth)
│   ├── navigation/      # Tab navigator, stack navigators, dock styling
│   ├── screens/         # Presentation screens (Home, Expenses, Budget, Loans, Settings)
│   ├── theme/           # Color tokens, typography, spacing
│   └── types/           # Domain entity and API response types
└── .agents/             # Mobile agent documentation & rules
```

## Read before you work
- `design-system.md` — Visual authority, color tokens, typography, spacing
- `docs/00-product-brief.md` — User journeys, UX goals, and interactions
- `docs/01-architecture.md` — Screen hierarchy, navigation flow, hooks layer
- `docs/05-conventions.md` — Touch targets, safe areas, dock padding rules
- `docs/07-environments-ops.md` — EAS update channels and build profiles
- `docs/08-tasks.md` — Live plan; update it as you go
- `rules/` — Mobile non-negotiables

## Mobile Non-Negotiables
1. **Never commit or push directly to `main`**: Always work on a feature branch (`feat/`, `fix/`, `refactor/`).
2. **Quality Gate**: Every commit must pass `npm run typecheck` (`tsc --noEmit`) with **0 errors**.
3. **OTA Protocol**:
   - For **Preview**: Automatically publish OTA updates to the `preview` branch so the user can test changes live on their phone.
   - For **Production**: **Never** publish to production automatically. Only update after explicit user approval.
4. **UI Authority**: Strictly adhere to `design-system.md`. Minimum 44x44pt touch targets. All scroll views must have `paddingBottom: 140` so items are never obscured by the elevated navigation dock.
5. **No Direct Axios in Screens**: Screens only invoke hooks (`src/hooks/`); network calls stay in `src/api/`.
