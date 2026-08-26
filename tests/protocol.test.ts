import { describe, expect, it } from "vitest";
import { decode, encode, ProtocolError } from "../src/protocol/codec";
import { hmacHex } from "../src/protocol/hmac";
import { matchesAlert, parseQuery } from "../src/protocol/search";
import { investigationScore, scoreBand } from "../src/protocol/risk";
import type { StoredAlert } from "../src/protocol/types";

describe("codec", () => {
  it("round-trips an envelope", () => {
    const json = encode("session.ping", { sentAt: 1 }, "survival-01", "r1");
    const decoded = decode(json);
    expect(decoded.type).toBe("session.ping");
    expect(decoded.requestId).toBe("r1");
    expect(decoded.data.sentAt).toBe(1);
  });

  it("rejects protocol 2", () => {
    expect(() => decode(JSON.stringify({
      protocol: 2,
      type: "session.ping",
      timestamp: 1,
      serverId: "s",
      data: {},
    }))).toThrow(ProtocolError);
  });
});

describe("hmac", () => {
  it("is stable for a known token and nonce", async () => {
    const hex = await hmacHex("secret-token", "00".repeat(32));
    expect(hex).toHaveLength(64);
    expect(hex).toBe(await hmacHex("secret-token", "00".repeat(32)));
    expect(hex).not.toBe(await hmacHex("other", "00".repeat(32)));
  });
});

describe("search", () => {
  const alert: StoredAlert = {
    id: "1",
    serverId: "survival-01",
    serverName: "Survival",
    timestamp: 1,
    playerName: "Steve",
    playerUuid: "uuid",
    checkId: "combat-reach",
    checkName: "Reach",
    domain: "Combat",
    vl: 12,
    maxVl: 15,
    severity: "HIGH",
    message: "too far",
    ping: 40,
    tps: 20,
    evidence: 5,
    threshold: 3,
    debug: {},
  };

  it("parses operators", () => {
    const q = parseQuery("Steve check:reach severity:high vl:>10 server:survival");
    expect(q.player ?? q.text).toContain("steve");
    expect(q.check).toBe("reach");
    expect(q.severity).toBe("HIGH");
    expect(q.minVl).toBe(10);
    expect(matchesAlert(alert, q)).toBe(true);
    expect(matchesAlert(alert, parseQuery("vl:>20"))).toBe(false);
  });
});

describe("risk", () => {
  it("returns 0 for no alerts and increases with clustered high VL", () => {
    expect(investigationScore([])).toBe(0);
    expect(scoreBand(10)).toBe("Normal");
    const alerts: StoredAlert[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      serverId: "s",
      serverName: "S",
      timestamp: Date.now() - i * 1000,
      playerName: "Steve",
      playerUuid: "u",
      checkId: i % 2 === 0 ? "move-speed" : "combat-reach",
      checkName: "x",
      domain: "Movement",
      vl: 14,
      maxVl: 15,
      severity: i === 0 ? "CRITICAL" : "HIGH",
      message: "",
      ping: 20,
      tps: 20,
      evidence: 1,
      threshold: 1,
      debug: {},
    }));
    const score = investigationScore(alerts);
    expect(score).toBeGreaterThan(40);
    expect(scoreBand(score).length).toBeGreaterThan(0);
  });
});
