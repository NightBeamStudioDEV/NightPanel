# NightPanel

NightPanel is the open-source desktop operations console for NightWatch Pro. It connects directly to Minecraft servers over an authenticated WebSocket and provides real-time alerts, server health, player investigation, analytics, and optional allowlisted moderation controls.

There is no NightBeam account, hosted backend, telemetry service, or arbitrary console access. Server addresses, player data, alerts, and credentials remain on the operator's devices.

## Requirements

- NightWatch Pro 3.3 or newer with its Night Panel bridge enabled
- Node.js 22 or newer for frontend development
- Stable Rust and the native platform toolchain for Tauri builds

## Connect a server

Enable the bridge in the NightWatch Pro server configuration:

```yaml
night-panel:
  enabled: true
  websocket:
    host: "127.0.0.1"
    port: 8765
```

Copy the generated `plugins/NightWatchPro/panel-token`, or run `/nw panel pair` on the server. Then add `ws://127.0.0.1:8765` in NightPanel.

Do not expose an unencrypted public `ws://` listener. Use loopback, a restricted private network, or `wss://` behind a TLS reverse proxy. See [deployment guidance](docs/deployment.md).

## Development

```bash
npm ci
npm test
npm run lint
npm run build
npm run tauri dev
```

On Windows, use the MSVC Rust toolchain. GNU `windres` is unreliable when the checkout path contains spaces.

The local fake server uses an explicit test-only token and never prints token values:

```bash
npm run fake-server
```

## Protocol

The public client contract is documented in [Protocol 1](docs/protocol.md). Versioned compatibility fixtures live under [`protocol/v1`](protocol/v1).

NightPanel intentionally does not implement arbitrary console commands, filesystem access, Java reflection, or unrestricted remote configuration.

## Security

Authentication secrets are stored in the operating system keychain in packaged builds. Alert history is stored in a local SQLite database. See [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

