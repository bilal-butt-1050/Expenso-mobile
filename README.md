# Expenso Mobile

Android app for Expenso, a personal finance tracker for spending, income, budgets and money lent
or borrowed. It is the client for the `Expenso-backend` API.

**Stack:** Expo SDK 57 · React Native 0.86 · TypeScript · TanStack Query · React Navigation 7

## What it does

- **Home**: the selected month's income, spending and savings, cash and net worth as of that
  month, and recent activity.
- **Activity**: one feed of every transaction, filterable by month and kind. Swipe to delete.
- **Budget**: monthly limits per category, measured against spending only.
- **Loans**: money lent or borrowed, with partial settlement, editing and deletion.
- **Offline**: writes made offline are queued and replayed once when the connection returns.

## Run it

The app uses native modules (Google sign-in, secure store), so it runs in a development build,
not Expo Go.

```bash
cp .env.example .env     # EXPO_PUBLIC_API_URL
npm install
npm run start            # Metro
npm run android          # connected device or emulator
npm run typecheck        # must be 0 errors
```

## Layout

```
src/api/          HTTP calls, one module per resource
src/hooks/        TanStack Query hooks: fetching, mutations, cache keys
src/screens/      presentation only
src/components/   shared UI primitives
src/navigation/   navigators and param lists
src/theme/        design tokens (see docs/design-system.md)
```

## Release

Preview and production are separate EAS channels, and both apps are installed side by side
(`com.expenso.app.preview` and `com.expenso.app`).

```bash
npm run update:preview   # OTA to the preview app
npm run update:prod      # OTA to production, only after device testing and approval
```

Working rules (layering, design system, safe areas, security) are in [CLAUDE.md](CLAUDE.md).
