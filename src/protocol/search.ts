import type { StoredAlert } from "./types";

export interface AlertQuery {
  text: string;
  player?: string;
  check?: string;
  server?: string;
  severity?: string;
  minVl?: number;
}

export function parseQuery(input: string): AlertQuery {
  const query: AlertQuery = { text: "" };
  const tokens: string[] = [];
  const parts = input.trim().split(/\s+/);
  for (const part of parts) {
    const split = part.indexOf(":");
    if (split <= 0) {
      tokens.push(part);
      continue;
    }
    const key = part.slice(0, split).toLowerCase();
    const value = part.slice(split + 1);
    if (key === "player") {
      query.player = value.toLowerCase();
    } else if (key === "check") {
      query.check = value.toLowerCase();
    } else if (key === "server") {
      query.server = value.toLowerCase();
    } else if (key === "severity") {
      query.severity = value.toUpperCase();
    } else if (key === "vl" && value.startsWith(">")) {
      query.minVl = Number(value.slice(1));
    } else {
      tokens.push(part);
    }
  }
  query.text = tokens.join(" ").toLowerCase();
  return query;
}

export function matchesAlert(alert: StoredAlert, query: AlertQuery): boolean {
  if (query.player && !alert.playerName.toLowerCase().includes(query.player)
      && !alert.playerUuid.toLowerCase().includes(query.player)) {
    return false;
  }
  if (query.check && !alert.checkId.toLowerCase().includes(query.check)
      && !alert.checkName.toLowerCase().includes(query.check)) {
    return false;
  }
  if (query.server && !alert.serverId.toLowerCase().includes(query.server)
      && !alert.serverName.toLowerCase().includes(query.server)) {
    return false;
  }
  if (query.severity && alert.severity !== query.severity) {
    return false;
  }
  if (query.minVl !== undefined && !Number.isNaN(query.minVl) && alert.vl <= query.minVl) {
    return false;
  }
  if (!query.text) {
    return true;
  }
  const hay = `${alert.playerName} ${alert.checkName} ${alert.checkId} ${alert.message} ${alert.domain}`.toLowerCase();
  return hay.includes(query.text);
}
