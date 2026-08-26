# Night Panel architecture

```text
Minecraft Server (NightWatch Pro)
      │
      │ WebSocket / WSS  (plugin is the server)
      ▼
Night Panel (Tauri 2 desktop)
      │
      ├── Connection Manager
      ├── Event Processor
      ├── Alert Store (SQLite)
      ├── Analytics
      ├── Notification Engine
      └── UI
```

## Trust boundary

The Minecraft process is trusted. Night Panel is an operator workstation. The WebSocket token is equivalent to `nightwatch.admin` for that socket. Anyone who can connect with the token can read every alert the plugin is configured to send, and — if `night-panel.remote-actions.enabled` is true — can toggle checks and reload the anticheat.

There is no NightBeam cloud, no account, and no telemetry.

## Plugin side

NightWatch Pro provides an optional private server bridge. NightPanel depends only on the public wire protocol and does not contain or require proprietary detection source code.

1. `CheckEngine.recordDetection` still goes `ViolationManager` → `AlertManager` → `ActionManager`.
2. `AlertManager` copies primitives into an `AlertSnapshot` and hands them to `PanelSink`.
3. `NightPanelBridge` updates an in-memory player map (ConcurrentHashMap) and `offer`s a bounded queue.
4. A dedicated daemon thread encodes JSON and writes frames.
5. Java-WebSocket owns accept/read/write threads. Bukkit/Folia API is only used on `SchedulerAdapter` tasks.

When `night-panel.enabled` is false the bridge never binds a port. `PanelSink.NOOP` is used until `onEnable` constructs the bridge.

## Desktop side

NightPanel is a Tauri 2 application. The UI is React + TypeScript. Tokens live in the OS keychain. Alert history lives in a local SQLite database. Multiple Minecraft servers can be connected at once; each has its own WebSocket and event stream.

## Folia

`PlayerData` is not thread-safe. The panel never reads it from a WebSocket thread. Join/alert/punishment snapshots are copied on the thread that already ran the detection (entity or global). The 1 Hz status sampler runs on the existing global-region timer. `get.players` reads the concurrent snapshot map.

## Backpressure

Queue capacity is 4096. `server.performance` is coalesced telemetry and is the first thing dropped. INFO/LOW alerts drop before HIGH/CRITICAL. Punishments try to stay. See `docs/protocol.md`.
