# Environments & Operations — Expenso Mobile

## EAS Build Profiles (`eas.json`)
- `development`: Used with `expo-dev-client` for native debugging.
- `preview`: Generates standalone internal testing APK (`com.expenso.app.preview`).
- `production`: Generates signed Play Store App Bundle (`.aab`) for production release (`com.expenso.app`).

## EAS Update Channels & OTA Workflow

### 1. Preview Updates (Automated on completion)
Whenever changes are verified, publish an OTA update to the `preview` branch:
```bash
npx eas-cli update --branch preview --environment preview --message "<Descriptive summary>" --non-interactive
```
The user can immediately open their preview APK and test the changes without reinstalling.

### 2. Production Updates (Manual Sign-off Only)
**Never publish to production automatically.**
Only after user sign-off and PR merge:
```bash
npx eas-cli update --branch production --environment production --message "<Release notes>" --non-interactive
```
