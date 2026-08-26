# Night Panel security

## Authentication

- Default: HMAC-SHA256(token, per-connection nonce). The token itself is not sent on login.
- Token storage on the server is managed by NightWatch Pro outside this repository.
- Token storage on the desktop: OS keychain. Not written to the SQLite database or settings JSON.
- Comparison: `MessageDigest.isEqual` on the HMAC bytes.
- Pairing (`/nw panel pair`): 6-digit code, 5 minute TTL, single use. Success returns the long-lived token once so the operator does not have to open the token file.
- Rate limit: 5 failed authentications per IP per minute, then disconnect.
- Max 3 concurrent clients, 64 KiB payload cap, 30 s idle timeout.

Authentication can be skipped only when **both** are true:

- `night-panel.allow-insecure: true`
- bind host is loopback (`127.0.0.1` / `localhost` / `::1`)

Any other combination keeps HMAC required.

## Remote actions

`night-panel.remote-actions.enabled` defaults to **false**. Monitoring works without it.

Allowlist when enabled:

- `get.status` / `get.players` / `get.player` / `get.checks` (also available without the flag)
- `checks.toggle`
- `anticheat.reload`

Not implemented and will not be: arbitrary console commands, filesystem access, Java reflection, Java serialization.

## Transport

- Default bind is `127.0.0.1:8765`.
- Binding a non-loopback address without TLS logs a warning every start.
- Optional WSS: PKCS#12 keystore, or PKCS#8 PEM certificate + key.
- Recommended remote access: reverse proxy with TLS in front of the loopback bind. See `docs/deployment.md`.

## Logging and exports

Tokens, pairing codes, HMAC values, and keystore passwords are never logged. `/nw panel token` regenerates the file and tells the operator the path; it does not print the secret. Night Panel diagnostics and CSV/JSON exports strip secrets.

## Privacy

Night Panel sends nothing to NightBeam or any other third party. Alerts, player names, UUIDs, and server addresses stay on the operator's machines.
