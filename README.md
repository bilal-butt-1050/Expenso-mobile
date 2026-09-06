# Expenso Mobile

The mobile client for the **Expenso** personal finance platform. Built with **React Native**, **Expo (SDK 57)**, and **TypeScript**, designed with a modern dark-first aesthetic.

---

## Features

- **Consolidated Dashboard:** Real-time visibility into monthly net balance, income, total expenses, savings goals, and a 6-month trend bar chart.
- **Expense Tracking:** Fast expense logging with customizable categories, payment method tags, "Need" vs "Want" flags, and one-tap "Paid / Unpaid" toggling.
- **Budget Monitoring:** Visual category budget utilization bars alerting you before spending limits are exceeded.
- **Income Logging:** Detailed monthly income records for salary, bonuses, and additional revenue streams.
- **Custom Categories:** Full category customization with tailored colors and icon selection.
- **Cross-Platform:** Runs natively on **iOS**, **Android**, and in modern **Web browsers**.

---

## Architecture & Project Structure

The codebase is strictly layered so presentational components never handle network logic or storage directly:

```text
mobile/
├── assets/             # Icons, splash screen, and branding assets
├── src/
│   ├── api/            # HTTP client & endpoint callers (Axios + token interceptors)
│   ├── components/     # Reusable UI primitives (Buttons, Cards, Inputs, Charts)
│   ├── context/        # Global state (AuthContext, AppDataContext)
│   ├── hooks/          # Domain data hooks (useDashboard, useExpenses, useBudgets, etc.)
│   ├── navigation/     # React Navigation stacks (Auth, Tabs, Modals)
│   ├── screens/        # Screen components organized by domain
│   │   ├── auth/       # Login & Registration screens
│   │   ├── budget/     # Budget allocation & management
│   │   ├── expenses/   # Expense list, filters, and logging form
│   │   ├── home/       # Primary dashboard overview
│   │   └── settings/   # Income, categories, and account preferences
│   ├── theme/          # Centralized tokens (colors, spacing, typography)
│   ├── types/          # TypeScript interface definitions (API models & navigation)
│   └── utils/          # Currency formatting and date arithmetic helpers
├── App.tsx             # Root application component & context providers
├── app.json            # Expo project configuration & API URL settings
├── babel.config.js     # Babel configuration with module alias mapping
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration extending Expo base
```

---

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Expenso Backend** running locally (see [Backend Setup Guide](https://github.com/bilal-butt-1050/Expenso-backend))
- **Expo Go** app installed on your physical mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://apps.apple.com/app/expo-go/id982107779)), or an Android/iOS emulator

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/bilal-butt-1050/Expenso-mobile.git
cd Expenso-mobile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Backend API URL

Open `app.json` and verify the `"extra" -> "apiUrl"` setting:

```json
"extra": {
  "apiUrl": "http://localhost:4000"
}
```

- **For Web & Emulators:** Keep `http://localhost:4000` (or `http://10.0.2.2:4000` for Android Studio emulators).
- **For Physical Devices via Expo Go (LAN):** Replace `localhost` with your computer's local Wi-Fi IPv4 address (e.g., `http://192.168.1.50:4000`). Both devices must be on the same Wi-Fi network.

---

### 4. Run the Development Server

#### Option A: Run in Web Browser
```bash
npx expo start --web
```
Opens the application immediately at `http://localhost:8081`.

#### Option B: Run on Physical Device (Expo Go)
```bash
npx expo start
```
- **Android:** Open the Expo Go app and tap **Scan QR Code**.
- **iOS:** Open the native **Camera** app and scan the QR code.

*(If your local network blocks direct device-to-device communication, run with tunnel mode: `npx expo start --tunnel`)*

#### Option C: Run on Emulators
- **Android Emulator:** `npm run android`
- **iOS Simulator:** `npm run ios`

---

## Demo Account Credentials

If you seeded the backend using `npm run seed`, you can authenticate immediately with:

- **Email:** `demo@expenso.app`
- **Password:** `password123`

You can also register a brand new account directly from the mobile app.

---

## Theming

All visual styles reference tokens defined in `src/theme/`:
- `colors.ts` — Semantic color definitions (backgrounds, surfaces, accents, alerts).
- `spacing.ts` — Standardized margin, padding, and layout scale.
- `typography.ts` — Consistent font sizing, letter spacing, and line heights.

To customize the primary accent color across the entire application, simply update `colors.accent` in `src/theme/colors.ts`.

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm start` | `expo start` | Launches the Expo Metro bundler |
| `npm run android` | `expo start --android` | Launches the project on a connected Android device / emulator |
| `npm run ios` | `expo start --ios` | Launches the project on an iOS simulator |
| `npm run typecheck` | `tsc --noEmit` | Runs full static TypeScript type checks |

---

## License

This project is licensed under the MIT License.
