#!/usr/bin/env node
/**
 * Protocol-1 NightWatch stand-in for UI and stress tests.
 * Usage: node tools/fake-server.mjs [--port 8765] [--rate 100] [--token secret]
 */
import { createHmac, randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";

const args = process.argv.slice(2);
const port = Number(arg("--port", "8765"));
const rate = Number(arg("--rate", "20"));
const token = arg("--token", process.env.NIGHTPANEL_TEST_TOKEN ?? "test-only-nightpanel-token");

const wss = new WebSocketServer({ host: "127.0.0.1", port });
wss.on("listening", () => {
  console.log(`fake NightWatch protocol 1 on ws://127.0.0.1:${port} token=[redacted] rate=${rate}/s`);
});

wss.on("connection", (socket) => {
  const nonce = randomBytes(32);
  const hello = frame("session.hello", {
    serverName: "Fake Survival",
    nonce: nonce.toString("hex"),
    protocolMin: 1,
    protocolMax: 1,
    antiCheatVersion: "3.3.0",
    minecraftVersion: "1.21.1",
    serverSoftware: "Paper",
    folia: false,
    remoteActionsEnabled: true,
  });
  socket.send(hello);
  let authed = false;
  let timer;

  socket.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (!authed) {
      if (msg.type !== "session.auth") {
        socket.close();
        return;
      }
      const expected = createHmac("sha256", token).update(nonce).digest("hex");
      const hmac = msg.data?.hmac;
      const pair = msg.data?.pairCode;
      if (hmac !== expected && pair !== "000000") {
        socket.send(frame("session.auth_fail", { reason: "authentication failed" }));
        socket.close();
        return;
      }
      authed = true;
      socket.send(frame("session.auth_ok", {
        server: {
          serverId: "fake-01",
          serverName: "Fake Survival",
          antiCheatVersion: "3.3.0",
          minecraftVersion: "1.21.1",
          serverSoftware: "Paper",
          folia: false,
          remoteActionsEnabled: true,
          protocol: 1,
        },
        checks: [
          { id: "move-speed", name: "Speed", domain: "Movement", enabled: true, maxVl: 15, alertOnly: false, counters: "SpeedHack" },
          { id: "combat-reach", name: "Reach", domain: "Combat", enabled: true, maxVl: 12, alertOnly: false, counters: "Killaura" },
        ],
        authorization: {
          credentialId: "test-admin",
          label: "Local test administrator",
          role: "ADMIN",
          permissions: [
            "monitor.read", "audit.read", "player.warn", "player.kick", "player.reset_vl",
            "player.exempt", "player.setback", "player.ban", "checks.write",
            "anticheat.reload", "credentials.manage", "websocket.port.manage",
          ],
        },
        capabilities: ["audit.v1", "player-actions.v1", "credentials.v1", "port-migration.v1"],
      }));
      let n = 0;
      timer = setInterval(() => {
        n += 1;
        socket.send(frame("player.alert", {
          player: { uuid: "00000000-0000-0000-0000-000000000001", name: n % 7 === 0 ? "Steve" : `P${n % 40}` },
          check: {
            id: n % 2 === 0 ? "move-speed" : "combat-reach",
            name: n % 2 === 0 ? "Speed" : "Reach",
            domain: n % 2 === 0 ? "Movement" : "Combat",
            violationLevel: 2 + (n % 14),
            maxViolationLevel: 15,
            streak: 3,
          },
          severity: n % 14 > 11 ? "CRITICAL" : n % 14 > 8 ? "HIGH" : "MEDIUM",
          message: "synthetic",
          evidence: 0.5,
          threshold: 0.3,
          ping: 30 + (n % 40),
          tps: 20,
        }));
        if (n % 20 === 0) {
          socket.send(frame("server.performance", {
            playerCount: 12,
            maxPlayers: 100,
            tps: 19.9,
            mspt: 18,
            memoryUsedBytes: 3e9,
            memoryMaxBytes: 8e9,
          }));
        }
      }, Math.max(1, Math.floor(1000 / rate)));
      return;
    }
    if (msg.type === "session.ping") {
      socket.send(frame("session.pong", { sentAt: msg.data?.sentAt, serverTime: Date.now() }, msg.requestId));
    } else if (msg.type === "get.status") {
      socket.send(frame("ok.status", {
        playerCount: 12, maxPlayers: 100, tps: 20, mspt: 18,
        memoryUsedBytes: 3e9, memoryMaxBytes: 8e9,
        checksTotal: 2, checksEnabled: 2, packetSource: true, remoteActionsEnabled: true,
      }, msg.requestId));
    } else if (msg.type === "get.players") {
      socket.send(frame("ok.players", { players: [{ uuid: "00000000-0000-0000-0000-000000000001", name: "Steve", ping: 42, totalVl: 8, alerts: 3, joinTime: Date.now() - 60000, perCheckVl: { "move-speed": 8 } }] }, msg.requestId));
    } else if (msg.type === "get.checks") {
      socket.send(frame("ok.checks", { checks: [] }, msg.requestId));
    } else if (msg.type === "get.audit") {
      socket.send(frame("ok.audit", { entries: [] }, msg.requestId));
    } else if (msg.type === "get.credentials") {
      socket.send(frame("ok.credentials", { credentials: [{ id: "test-admin", label: "Local test administrator", role: "ADMIN", createdAt: Date.now(), legacy: false }] }, msg.requestId));
    } else if (msg.type === "credentials.create_pair") {
      socket.send(frame("ok.pair", { pairCode: "000 000", expiresAt: Date.now() + 300000 }, msg.requestId));
    } else if (msg.type === "credentials.revoke") {
      socket.send(frame("ok.revoke", { credentialId: msg.data?.credentialId }, msg.requestId));
    } else if (msg.type === "player.action") {
      socket.send(frame("ok.player_action", { action: msg.data?.action, uuid: msg.data?.uuid }, msg.requestId));
      socket.send(frame("audit.event", {
        id: `audit-${Date.now()}`, timestamp: Date.now(), serverId: "fake-01",
        credentialId: "test-admin", credentialLabel: "Local test administrator", role: "ADMIN",
        action: msg.data?.action, targetUuid: msg.data?.uuid, targetName: "Steve",
        reason: msg.data?.reason, outcome: "SUCCESS",
      }));
    } else if (msg.type === "settings.websocket.prepare") {
      const nextPort = Number(msg.data?.port ?? port);
      socket.send(frame("ok.websocket_prepare", {
        migrationId: `migration-${Date.now()}`,
        url: `ws://127.0.0.1:${nextPort}`,
        port: nextPort,
        expiresAt: Date.now() + 60000,
      }, msg.requestId));
    } else if (msg.type === "settings.websocket.commit" || msg.type === "settings.websocket.abort") {
      socket.send(frame(msg.type === "settings.websocket.commit" ? "ok.websocket_commit" : "ok.websocket_abort", { migrationId: msg.data?.migrationId }, msg.requestId));
    } else if (msg.type === "checks.toggle" || msg.type === "anticheat.reload") {
      socket.send(frame(msg.type === "checks.toggle" ? "ok.toggle" : "ok.reload", msg.data ?? {}, msg.requestId));
    }
  });

  socket.on("close", () => clearInterval(timer));
});

function frame(type, data, requestId) {
  const envelope = { protocol: 1, type, timestamp: Date.now(), serverId: "fake-01", data };
  if (requestId) envelope.requestId = requestId;
  return JSON.stringify(envelope);
}

function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
