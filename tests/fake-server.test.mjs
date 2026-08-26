import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

let child;
let socket;

afterEach(() => {
  socket?.close();
  child?.kill();
  socket = undefined;
  child = undefined;
});

describe("fake server integration", () => {
  it("authenticates, exposes roles, performs an allowlisted action, and emits audit", async () => {
    const port = await freePort();
    child = spawn(process.execPath, ["tools/fake-server.mjs", "--port", String(port), "--rate", "1", "--token", "test-only-nightpanel-token"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    await waitForOutput(child.stdout, "token=[redacted]");
    socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages = messageQueue(socket);
    const hello = await messages.next("session.hello");
    const hmac = createHmac("sha256", "test-only-nightpanel-token")
      .update(Buffer.from(hello.data.nonce, "hex"))
      .digest("hex");
    socket.send(frame("session.auth", { hmac }, "auth-1"));
    const auth = await messages.next("session.auth_ok");
    expect(auth.data.authorization.role).toBe("ADMIN");
    expect(auth.data.authorization.permissions).toContain("player.kick");

    socket.send(frame("player.action", {
      action: "warn",
      uuid: "00000000-0000-0000-0000-000000000001",
      reason: "Protocol integration test",
    }, "action-1"));
    expect((await messages.next("ok.player_action")).requestId).toBe("action-1");
    const audit = await messages.next("audit.event");
    expect(audit.data.action).toBe("warn");
    expect(audit.data.reason).toBe("Protocol integration test");
    expect(audit.data.outcome).toBe("SUCCESS");
  }, 10_000);
});

function frame(type, data, requestId) {
  return JSON.stringify({ protocol: 1, type, timestamp: Date.now(), serverId: "test", requestId, data });
}

function messageQueue(ws) {
  const queued = [];
  const waiters = [];
  ws.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    const index = waiters.findIndex((waiter) => waiter.type === message.type);
    if (index >= 0) {
      waiters.splice(index, 1)[0].resolve(message);
    } else {
      queued.push(message);
    }
  });
  return {
    next(type) {
      const index = queued.findIndex((message) => message.type === type);
      if (index >= 0) return Promise.resolve(queued.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), 5000);
        waiters.push({ type, resolve: (value) => { clearTimeout(timer); resolve(value); } });
      });
    },
  };
}

function waitForOutput(stream, marker) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`fake server did not start: ${output}`)), 5000);
    stream.on("data", (chunk) => {
      output += String(chunk);
      if (output.includes(marker)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
