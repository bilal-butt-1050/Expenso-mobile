# Security Standards — Expenso Mobile

1. **Secure Storage**:
   - Store sensitive JWT authentication tokens in `Expo.SecureStore` (backed by iOS Keychain / Android Keystore).
   - Use `AsyncStorage` strictly for non-sensitive data (theme preference, UI state flags).
2. **Zero Hardcoded Secrets**:
   - Never commit sensitive API keys or staging credentials.
   - Load URLs and public client IDs through `expo-constants` and `.env`.
3. **Safe Navigation**:
   - Clear auth tokens and reset navigation history to the Login screen upon logout.
