# Git & OTA Release Protocol — Expenso Mobile

1. **Never Commit to Main**: Branch off `main` for all work (`feat/<name>`, `fix/<name>`, `refactor/<name>`).
2. **Conventional Commits**:
   - `feat(expenses): add one-tap toggle for paid status on expense row`
   - `fix(budget): correct progress bar calculation when budget is zero`
3. **EAS OTA Update Protocol**:
   - **Preview Channel**: After implementing and verifying changes, automatically run:
     ```bash
     npx eas-cli update --branch preview --environment preview --message "<Feature summary>" --non-interactive
     ```
     This allows the user to immediately test changes on their installed preview APK.
   - **Production Channel**: **Never** publish to production automatically. Requires explicit human confirmation.
4. **Never Self-Merge**: Push the branch and open a PR for user review.
