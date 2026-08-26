# Night Panel deployment

## Local (recommended)

```yaml
night-panel:
  enabled: true
  websocket:
    host: "127.0.0.1"
    port: 8765
```

1. Start the Minecraft server with NightWatch Pro 3.3.0+.
2. On first enable, the plugin writes `plugins/NightWatchPro/panel-token`.
3. In Night Panel: Connect Server → `ws://127.0.0.1:8765` → paste the token.
4. Or run `/nw panel pair` in-game and enter the six-digit code.

Do not put the token in `config.yml` if you share that file. Leave `night-panel.websocket.authentication.token` empty.

## Remote access over TLS

Do not expose `ws://0.0.0.0:8765` on the public internet.

Keep the plugin on loopback and terminate TLS at a reverse proxy.

### Caddy

```caddy
panel.example.com {
    reverse_proxy 127.0.0.1:8765
}
```

Night Panel connects to `wss://panel.example.com`.

### nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:8765;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
}
```

### Plugin-side WSS

If you already have a PKCS#12 keystore:

```yaml
night-panel:
  enabled: true
  websocket:
    host: "0.0.0.0"
    tls:
      enabled: true
      keystore: "panel.p12"
      keystore-password: "..."
```

PKCS#8 PEM is also accepted (`certificate` + `private-key`). PKCS#1 (`BEGIN RSA PRIVATE KEY`) is not; convert with `openssl pkcs8`.

## Firewall

If you bind a public address, restrict the port to your operator IPs. The token is a password, not a substitute for network isolation.

## Folia / Paper

The same jar. No extra setup. Remote toggle/reload hops onto the global region scheduler; they are never run on the WebSocket thread.
