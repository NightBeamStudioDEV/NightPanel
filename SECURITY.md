# Security Policy

## Reporting a vulnerability

Do not open a public issue for authentication bypasses, credential exposure, update-signing problems, or remote-action vulnerabilities.

Use GitHub's private vulnerability reporting:

`https://github.com/NightBeamStudioDEV/NightPanel/security/advisories/new`

Include the affected version, platform, reproduction steps, security impact, and sanitized logs. Never include a real NightWatch token, signing key, keystore, private certificate, or player database.

## Security boundaries

- NightPanel connects only to endpoints configured by the operator.
- Credentials belong in the OS keychain and must never appear in logs, exports, crash reports, fixtures, or screenshots.
- Remote actions are allowlisted, permission checked, audited, and disabled on the server by default.
- Arbitrary console execution, unrestricted filesystem access, and unsigned update installation are prohibited by design.

## Supported versions

Security fixes are provided for the latest released NightPanel major version and the protocol versions listed in its release notes.

