# Mobile Git + EAS Workflow

These rules apply ONLY to the mobile repository. Do not apply them to backend repositories.

## Core Principle

Git/GitHub and EAS have separate responsibilities:

- Git = source code, branches, commits, PRs, reviews, merges.
- EAS = mobile builds, OTA updates, channels, and releases.
- Merging a PR does NOT automatically mean the app has been released.
- Only an explicit EAS deployment/release changes what devices receive.

## Standard Development Flow

Follow this workflow:

Feature Branch
→ Local Development
→ Local Validation
→ Preview EAS Build/Update
→ Device Testing
→ PR
→ Code Review
→ Merge into `main`
→ Production EAS Build/Update

Do NOT send unreviewed feature-branch code directly to Production.

## Preview Environment

Use Preview to test changes before merging.

For JavaScript/TypeScript/React changes that are compatible with the existing native binary:
- Prefer an EAS Update.

For changes affecting native code/configuration/dependencies:
- Create a new EAS Preview Build.

Examples that may require a new build:
- Native dependencies
- Expo SDK/native runtime changes
- Permissions
- Config plugins
- Native modules
- Native configuration

Do not create a new build unnecessarily when an EAS Update is sufficient.

## Pull Requests

Use feature/fix branches such as:

`feature/google-auth`
`feature/profile-screen`
`fix/notification`

Before opening a PR:
- Run relevant type checks, linting, tests, and local validation.
- Test significant mobile changes through Preview when appropriate.
- Use small, focused, human-readable commits.

PRs should clearly describe:
- What changed
- Why it changed
- Testing performed
- Whether an EAS Build or EAS Update was used

## Merge vs Release

After review and approval:

`feature branch → PR → merge into main`

This only updates the Git repository.

It does NOT automatically release the application unless explicit CI/CD automation is configured.

After merging, release the approved code to the Production EAS channel when appropriate.

## Production

The current Production environment is for internal testing and is not being treated as a public Google Play release.

Production releases should only contain:
- Reviewed code
- Approved changes
- Passing checks
- Changes compatible with the target production binary

For JS/TS changes compatible with the installed native runtime:
→ use EAS Update.

For native changes:
→ create a new Production EAS Build.

Never publish an OTA update that requires native functionality unavailable in the installed binary.

## Git Commit Rules

Keep commits small and focused.

Good:
- `add google auth`
- `fix profile validation`
- `update employee sync`

Avoid:
- `changes`
- `final`
- `fix`
- `updated stuff`

Do not mix unrelated changes into the same commit.

## Agent Decision Rule

Before any EAS deployment, determine:

1. Is this Preview or Production?
2. Does the change require a new native build?
3. Can it safely use EAS Update?
4. Has the change been tested?
5. If Production, has it been reviewed and merged into `main`?
6. Is the target EAS channel correct?
7. Is the installed binary compatible with the update?

### Golden Rule

Develop → Preview → Test → PR → Review → Merge → Production

Git controls the code.
EAS controls the mobile release.
A Git merge is NOT a production deployment.
