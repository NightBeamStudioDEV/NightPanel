# Night Panel Protocol 1

Night Panel (desktop) connects **outbound** to NightWatch Pro, which runs a WebSocket server.
There is no NightBeam cloud. Traffic stays between the operator's panel and their Minecraft servers.

This document is the contract. Java models live in `com.nightbeam.nightwatch.panel.protocol`.
TypeScript models live in `src/protocol`. Versioned examples live in `protocol/v1`. Client models and compatibility fixtures must stay 1:1 with this contract.

## Transport

- WebSocket, text frames, UTF-8 JSON.
- Default bind: `ws://127.0.0.1:8765`.
- `wss://` when the plugin has TLS enabled (PKCS#12 keystore, or PKCS#8 PEM cert+key).
- Maximum payload: 65536 bytes. Larger frames close the session.
- Maximum authed clients: 3 (configurable).
- Application heartbeat: `session.ping` / `session.pong` every 15 seconds.
- Idle timeout: 30 seconds without any frame.

Public unencrypted `ws://` is not supported as a recommended deployment. Bind loopback, or terminate TLS at a reverse proxy. See `docs/deployment.md`.

## Envelope

Every frame:

```json
{
  "protocol": 1,
  "type": "player.alert",
  "timestamp": 1787720000000,
  "serverId": "survival-01",
  "requestId": "optional-uuid",
  "data": {}
}
```

| Field | Required | Notes |
|---|---|---|
| `protocol` | yes | Integer. This version is `1`. |
| `type` | yes | Dotted string from the tables below. |
| `timestamp` | yes | Unix epoch milliseconds. |
| `serverId` | yes | Plugin `night-panel.server-id`. |
| `requestId` | no | Client-generated. Echoed on `ok.*` / `error.*`. |
| `data` | yes | Object. Empty object if the type has no payload. |

Rules:

- Unknown `type` on an authed session is ignored (forward compatible).
- Unknown fields inside `data` are ignored.
- Missing required envelope fields, a non-object `data`, or a non-integer `protocol` close the session after `error.protocol`.
- `protocol != 1` closes after `error.protocol_mismatch` (`data.serverProtocol`, `data.clientProtocol`).

## Handshake

```text
TCP / TLS
  plugin  →  session.hello
  client  →  session.auth
  plugin  →  session.auth_ok
          or session.auth_fail  (then close)
```

Unauthed clients may send only `session.auth`. Anything else closes the session.

### `session.hello` (server → client)

```json
{
  "protocol": 1,
  "type": "session.hello",
  "timestamp": 0,
  "serverId": "survival-01",
  "data": {
    "serverName": "Survival Server",
    "nonce": "hex-32-bytes",
    "protocolMin": 1,
    "protocolMax": 1,
    "antiCheatVersion": "3.3.0",
    "minecraftVersion": "1.21.1",
    "serverSoftware": "Paper",
    "folia": false,
    "remoteActionsEnabled": false
  }
}
```

`nonce` is 32 random bytes, hex-encoded, single-use for this connection.

### `session.auth` (client → server)

HMAC path (normal):

```json
{
  "type": "session.auth",
  "data": {
    "hmac": "<hex HMAC-SHA256(token, nonce)>"
  }
}
```

Pairing path (one-shot, from `/nw panel pair`):

```json
{
  "type": "session.auth",
  "data": {
    "pairCode": "928417"
  }
}
```

Spaces in `pairCode` are ignored. HMAC is computed over the **raw nonce bytes**, not the hex string, using the UTF-8 token as the key. Compare with `MessageDigest.isEqual`.

### `session.auth_ok` (server → client)

```json
{
  "type": "session.auth_ok",
  "data": {
    "token": "optional-hex-token-when-paired",
    "server": {
      "serverId": "survival-01",
      "serverName": "Survival Server",
      "antiCheatVersion": "3.3.0",
      "minecraftVersion": "1.21.1",
      "serverSoftware": "Paper",
      "folia": false,
      "remoteActionsEnabled": false,
      "protocol": 1
    },
    "checks": [
      {
        "id": "move-speed",
        "name": "Speed",
        "domain": "Movement",
        "enabled": true,
        "maxVl": 15,
        "alertOnly": false,
        "counters": "Wurst SpeedHack, Meteor Speed"
      }
    ]
  }
}
```

`data.token` is present only after a successful pairing so the panel can store the long-lived secret. It is never included on HMAC logins.

### `session.auth_fail` (server → client)

```json
{ "type": "session.auth_fail", "data": { "reason": "authentication failed" } }
```

The reason is deliberately generic. Rate-limited attempts use `error.rate_limited` instead.

## Heartbeat

Client → `session.ping` with `data.sentAt` (epoch ms).
Server → `session.pong` echoing `sentAt` and adding `data.serverTime`.

RTT displayed in the UI is `now - sentAt` on the client when pong arrives.

## Server → client events

### `player.alert`

Emitted when NightWatch would send a staff alert (same VL gate as `AlertManager`).

```json
{
  "type": "player.alert",
  "data": {
    "player": { "uuid": "...", "name": "Steve" },
    "check": {
      "id": "move-speed",
      "name": "Speed",
      "domain": "Movement",
      "violationLevel": 8.2,
      "maxViolationLevel": 15,
      "streak": 3
    },
    "severity": "HIGH",
    "message": "horizontal 0.62 > 0.36",
    "evidence": 0.62,
    "threshold": 0.36,
    "ping": 42,
    "tps": 19.98,
    "debug": {
      "horizontalSpeed": 0.482,
      "deltaY": 0.0,
      "onGround": false,
      "airTicks": 12,
      "context": "ice"
    }
  }
}
```

`debug` is omitted when `night-panel.alerts.include.debug` is false.
`severity` is an investigation label derived from VL / max-VL, not proof of cheating:

| Band | VL / max-VL |
|---|---|
| INFO | < 0.15 |
| LOW | < 0.30 |
| MEDIUM | < 0.50 |
| HIGH | < 0.80 |
| CRITICAL | ≥ 0.80 |

### `player.punishment`

```json
{
  "type": "player.punishment",
  "data": {
    "player": { "uuid": "...", "name": "Steve" },
    "action": "setback",
    "checkId": "move-fly",
    "violationLevel": 12.0
  }
}
```

`action` is `setback`, `kick`, or `ban`.

### `player.join` / `player.quit`

```json
{
  "type": "player.join",
  "data": {
    "player": { "uuid": "...", "name": "Steve" },
    "ping": 40
  }
}
```

### `server.performance`

Coalesced (~1 Hz). Safe to drop.

```json
{
  "type": "server.performance",
  "data": {
    "playerCount": 182,
    "maxPlayers": 500,
    "tps": 20.0,
    "mspt": 18.4,
    "memoryUsedBytes": 5583457484,
    "memoryMaxBytes": 12884901888
  }
}
```

### `anticheat.status`

Sent after auth (inside `session.auth_ok` server block) and whenever the plugin reloads.

```json
{
  "type": "anticheat.status",
  "data": {
    "checksTotal": 49,
    "checksEnabled": 47,
    "packetSource": true,
    "remoteActionsEnabled": false
  }
}
```

### `anticheat.reload`

Broadcast after a successful `/nw reload` or a remote reload.

### `check.debug`

Only when NightWatch debug is on for that detection. Same shape as `player.alert` plus `data.trace` (human-readable evidence line). May be dropped under load.

## Client → server requests

Every request except `session.auth` requires an authed session and a `requestId`.
Responses echo `requestId`.

Always available after auth:

| type | data | response |
|---|---|---|
| `get.status` | `{}` | `ok.status` — same payload as `server.performance` plus anticheat status |
| `get.players` | `{}` | `ok.players` — `{ "players": [ PlayerSnapshot ] }` |
| `get.player` | `{ "uuid": "..." }` | `ok.player` |
| `get.checks` | `{}` | `ok.checks` — `{ "checks": [ CheckInfo ] }` |

`PlayerSnapshot`:

```json
{
  "uuid": "...",
  "name": "Steve",
  "ping": 42,
  "totalVl": 11.5,
  "alerts": 7,
  "lastCheckId": "move-speed",
  "joinTime": 1787710000000,
  "perCheckVl": { "move-speed": 8.2, "combat-reach": 3.3 }
}
```

Only when `night-panel.remote-actions.enabled` is true (default **false**):

| type | data | response |
|---|---|---|
| `checks.toggle` | `{ "id": "move-speed", "enabled": false }` | `ok.toggle` |
| `anticheat.reload` | `{}` | `ok.reload` |

### Optional authorization extension

Servers may expose role-scoped credentials without changing the Protocol 1 envelope. HMAC clients include an optional `credentialId` in `session.auth`; clients that omit it use the legacy administrator credential.

`session.auth_ok.data.authorization` contains `credentialId`, a non-secret label, `role` (`VIEWER`, `MODERATOR`, or `ADMIN`), and a permission array. `data.capabilities` lists supported optional operations. Clients must hide or disable operations they are not authorized to use, but the server remains the authority and must reject unauthorized requests with `error.forbidden`.

### Allowlisted player actions

`player.action` accepts an action enum, player UUID, required audit reason, and action-specific bounded options. Valid actions are `warn`, `kick`, `reset_vl`, `temporary_exemption`, `revoke_exemption`, `setback`, and `ban`. Arbitrary commands and unstructured arguments are invalid.

### Audit and access management

| type | purpose |
|---|---|
| `get.audit` / `ok.audit` | Paginated, sanitized server-authoritative action history |
| `audit.event` | Live completed or denied action record |
| `get.credentials` / `ok.credentials` | Non-secret credential metadata, admin only |
| `credentials.create_pair` / `ok.pair` | Issue a five-minute role-scoped pairing code |
| `credentials.revoke` / `ok.revoke` | Revoke a credential by id |

Secrets, token material, HMAC values, and pairing-code history are never included in audit or credential-list responses.

### Guarded WebSocket port migration

Administrators may call `settings.websocket.prepare` with a port from 1024 through 65535. A supporting server binds a temporary second listener before replying with `ok.websocket_prepare` containing `migrationId`, `url`, `port`, and `expiresAt`. The client authenticates on the new endpoint and sends `settings.websocket.commit`; otherwise the migration expires and the old listener remains active. `settings.websocket.abort` explicitly cancels a pending migration.

Otherwise the server replies `error.remote_disabled` and does nothing.

There is no `EXECUTE_ARBITRARY_CONSOLE_COMMAND`. There is no filesystem access.

## Errors

```json
{
  "type": "error.unauthorized",
  "requestId": "...",
  "data": { "message": "not authenticated" }
}
```

| type | When |
|---|---|
| `error.protocol` | Malformed envelope |
| `error.protocol_mismatch` | `protocol` ≠ 1 |
| `error.unauthorized` | Request before auth |
| `error.rate_limited` | Too many auth failures |
| `error.invalid_request` | Missing fields, unknown check id |
| `error.remote_disabled` | Toggle/reload while remote actions are off |
| `error.forbidden` | Credential lacks the required role or permission |
| `error.conflict` | Duplicate, stale, or conflicting action/migration |
| `error.action_unavailable` | Target state cannot support the requested allowlisted action |

## Backpressure

The plugin never serializes or writes sockets on the Minecraft thread.

- Detection thread copies primitives into an `AlertSnapshot` and `offer`s a bounded queue (4096).
- A dedicated drain thread encodes JSON and writes WebSocket frames.
- `server.performance` is coalesced to the latest sample and is not queued as individual events.
- If the queue is full: drop telemetry and oldest INFO/LOW first. HIGH, CRITICAL, and punishments are retained when possible.
- If there are zero authed sessions, snapshots are not allocated.

## Versioning

Protocol 1 is this document. A future protocol 2 must:

- Advertise `protocolMin` / `protocolMax` in `session.hello`.
- Reject incompatible clients with `error.protocol_mismatch` rather than hanging up silently.

Night Panel must show:

```text
Server protocol: 2
Night Panel protocol: 1
This Night Panel version is not compatible with this Anti-Cheat version.
```
