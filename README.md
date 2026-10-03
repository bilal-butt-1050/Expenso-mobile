# Expenso

**A personal finance app that tells you the truth about your money.** Track expenses, income, budgets and money lent or borrowed. At a glance, see what you have, where it went, whether you're within budget, and who owes whom.

This is the Android app, built with React Native and Expo. The API lives in [Expenso-backend](https://github.com/bilal-butt-1050/Expenso-backend).

**Stack:** React Native 0.86 · Expo SDK 57 · TypeScript · React Navigation 7 · TanStack Query · Reanimated

[![CI](https://github.com/bilal-butt-1050/Expenso-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/bilal-butt-1050/Expenso-mobile/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Features

- **Home:** cash available today; this month's income, expenses and what's left; spending by category with budget bars; what's still owed both ways. Any past month can be opened as it stood at that month's end.
- **Activity:** one feed with All, Expenses, Income and Loans segments. Swipe to delete with undo, and a saved record is highlighted when you land on it.
- **Loans:** lent or borrowed, with dates, due dates and partial repayments. The form first asks whether the money went through your cash, and that answer can be changed later. Repayments can be dated, forgiven or undone. Loans are grouped as Open or Settled.
- **Who paid?** Every expense can be paid by you, by someone else (it counts as your spending and as a debt to them), or split (only your part counts as spending; their share is owed to you).
- **Budgets:** monthly limits per category, and a notice when a save crosses one.
- **Correct my balance:** when the app and your wallet disagree, the difference is saved as a correction, never as fake income or spending.
- **Offline-first:** saves made offline are queued, survive a restart and replay in order. A client-generated id means a retried save can never be duplicated.
- **Sign-in:** passwordless email codes or Google; optional App lock with fingerprint, face or screen lock.
- **Polish:** dark and light themes, sounds and haptics, screen-reader labels, and layouts that hold at 200% font size. Nine currencies, with lakh and crore for rupees.

---

## Run it locally

You need **Node.js 20+** and the **[backend](https://github.com/bilal-butt-1050/Expenso-backend) running locally**. Start the backend first; it serves `http://localhost:4000`.

```bash
git clone https://github.com/bilal-butt-1050/Expenso-mobile.git
cd Expenso-mobile
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL (see below)
```

### Option A: in the browser (quickest)

```bash
# .env: EXPO_PUBLIC_API_URL=http://localhost:4000
npx expo start --web
```

### Option B: on an Android phone or emulator

The app uses native modules (Google sign-in, biometrics, audio), so it needs a **development build**, not Expo Go:

```bash
# .env: EXPO_PUBLIC_API_URL=http://<your PC's Wi-Fi IP>:4000   (an emulator can use http://10.0.2.2:4000)
npx expo run:android     # builds and installs the dev build (needs the Android SDK)
npx expo start           # then open the app on the device
```

### Signing in locally
Enter any email. In development the backend doesn't send email; **it prints the 6-digit code in the backend's terminal**. Google sign-in needs your own OAuth client IDs, so use email locally.

---

## Check it

```bash
npm run typecheck        # 0 errors required
npm run lint             # 0 errors required
```

CI runs both on every pull request.

---

## Project layout

```
src/
  api/          HTTP calls, one module per resource (no React)
  hooks/        data fetching and mutations (TanStack Query)
  lib/          query client, offline write queue, app lock
  screens/      home, activity, loans, expenses, income, budget, settings, auth, onboarding
  components/   shared UI: sheets, pickers, rows, buttons, money text
  navigation/   root stack and tabs
  theme/        colours, spacing, typography tokens (dark and light)
  utils/        money and date formatting, validation, haptics
  types/        models that mirror the API
```

Screens call hooks, and hooks call `api/`. A screen never calls the HTTP client directly. Every colour, spacing and font size comes from `src/theme/`. The design rules are in [docs/design-system.md](docs/design-system.md).

---

## How releases work

- **Preview and production** are separate EAS channels, and separate apps installed side by side.
- App-code changes ship as over-the-air updates, which reach installed apps without a store release. Every change goes to preview first and is tested on a real phone before production.
- `main` is protected: changes arrive through reviewed pull requests with a green CI check.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Found a security problem? Please report it privately; see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Muhammad Bilal Afzal
