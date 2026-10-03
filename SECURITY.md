# Security policy

Expenso handles people's financial data, so security reports are taken seriously.

## Reporting a vulnerability

**Please don't open a public issue for a security problem.** Report it privately instead:

- Use GitHub's **"Report a vulnerability"** button on this repository's **Security** tab (private vulnerability reporting).

Please include:
- what you found and where (screen, file, line);
- how to reproduce it;
- what an attacker could do with it.

You'll get a reply within a few days. Once a fix is released you'll be credited, unless you'd rather not be.

## Scope

In scope: this app's code, including how it stores tokens and cached data, its offline write queue, App lock, and anything that could leak one user's data to another person on the same device.

Problems in the API belong to the [backend repository](https://github.com/bilal-butt-1050/Expenso-backend/security).

Out of scope: findings that need a rooted or already-compromised device, and reports from automated scanners without a working proof of concept.

Please test only against your own local setup. Never test against the production server or other people's accounts.
