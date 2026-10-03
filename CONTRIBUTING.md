# Contributing to Expenso (mobile)

Thanks for helping. Bug fixes, UI improvements, accessibility fixes and features are all welcome.

## Getting started

1. Set up and run the [backend](https://github.com/bilal-butt-1050/Expenso-backend) locally.
2. Follow **Run it locally** in the [README](README.md). The browser option is the quickest way to start.
3. Sign in with any email. The code appears in the backend's terminal.

## How changes are made

1. Fork the repository and create a branch: `feat/…`, `fix/…`, `chore/…` or `refactor/…`.
2. Keep each pull request focused on one thing.
3. Before you open it, make sure both pass:
   ```bash
   npm run typecheck
   npm run lint
   ```
4. Open a pull request against `main`. Describe what changed and why, and add a screenshot for any visual change. CI runs the same checks.

`main` is protected: every change goes through a reviewed pull request with a green CI check.

## Rules the code follows

- **Layers:** screens call hooks, hooks call `src/api/`. A screen never imports the HTTP client.
- **No `any`.** API responses, props and route params are typed.
- **Design tokens only.** Colours, spacing, radii and font sizes come from `src/theme/`. Never add a raw hex value or a stray `fontSize`. See [docs/design-system.md](docs/design-system.md).
- **Restraint.** Nothing new goes on a screen unless something else leaves it, and the field that identifies a row is never removed.
- **Every async screen has loading, empty and error states.**
- **Touch targets are at least 48×48.** Scroll views clear the tab bar with `useTabBarPadding()`.
- **Accessibility:** interactive elements have a role and a label for screen readers, and layouts must hold at 200% font size.
- **Money and dates:** use the formatters in `src/utils/`; never format money by hand.

## Reporting bugs and security issues

- Bugs: open an issue with steps to reproduce, and a screenshot if it's visual.
- Security problems: **don't** open a public issue. See [SECURITY.md](SECURITY.md).
