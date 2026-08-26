export const PROTOCOL = 1 as const;

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OperatorRole = "VIEWER" | "MODERATOR" | "ADMIN";
export type Permission =
  | "monitor.read"
  | "audit.read"
  | "player.warn"
  | "player.kick"
  | "player.reset_vl"
  | "player.exempt"
  | "player.setback"
  | "player.ban"
  | "checks.write"
  | "anticheat.reload"
  | "credentials.manage"
  | "websocket.port.manage";

export interface AuthorizationInfo {
  credentialId: string;
  label: string;
  role: OperatorRole;
  permissions: Permission[];
}
export type ConnectionState =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "auth-failed"
  | "protocol-mismatch";

export interface Envelope<T = Record<string, unknown>> {
  protocol: number;
  type: string;
  timestamp: number;
  serverId: string;
  requestId?: string;
  data: T;
}

export interface HelloData {
  serverName: string;
  nonce: string;
  protocolMin: number;
  protocolMax: number;
  antiCheatVersion: string;
  minecraftVersion: string;
  serverSoftware: string;
  folia: boolean;
  remoteActionsEnabled: boolean;
}

export interface ServerInfo {
  serverId: string;
  serverName: string;
  antiCheatVersion: string;
  minecraftVersion: string;
  serverSoftware: string;
  folia: boolean;
  remoteActionsEnabled: boolean;
  protocol: number;
}

export interface CheckInfo {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  maxVl: number;
  alertOnly: boolean;
  counters: string;
}

export interface AuthOkData {
  token?: string;
  server: ServerInfo;
  checks: CheckInfo[];
  authorization?: AuthorizationInfo;
  capabilities?: string[];
}

export interface AlertPayload {
  player: { uuid?: string; name?: string };
  check: {
    id?: string;
    name?: string;
    domain?: string;
    violationLevel?: number;
    maxViolationLevel?: number;
    streak?: number;
  };
  severity: Severity;
  message: string;
  evidence?: number;
  threshold?: number;
  ping?: number;
  tps?: number;
  debug?: Record<string, string>;
}

export interface PlayerSnapshot {
  uuid: string;
  name: string;
  ping: number;
  totalVl: number;
  alerts: number;
  lastCheckId?: string;
  joinTime: number;
  perCheckVl: Record<string, number>;
  exemptUntil?: number;
  lastAction?: string;
}

export type PlayerActionType =
  | "warn"
  | "kick"
  | "reset_vl"
  | "temporary_exemption"
  | "revoke_exemption"
  | "setback"
  | "ban";

export interface PlayerActionRequest {
  action: PlayerActionType;
  uuid: string;
  reason: string;
  checkId?: string;
  durationSeconds?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  serverId: string;
  credentialId: string;
  credentialLabel: string;
  role: OperatorRole;
  action: string;
  targetUuid?: string;
  targetName?: string;
  reason?: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  detail?: string;
}

export interface CredentialSummary {
  id: string;
  label: string;
  role: OperatorRole;
  createdAt: number;
  lastUsedAt?: number;
  legacy?: boolean;
}

export interface WebSocketMigration {
  migrationId: string;
  url: string;
  port: number;
  expiresAt: number;
}

export interface StatusPayload {
  playerCount: number;
  maxPlayers: number;
  tps: number;
  mspt: number;
  memoryUsedBytes: number;
  memoryMaxBytes: number;
  checksTotal?: number;
  checksEnabled?: number;
  packetSource?: boolean;
  remoteActionsEnabled?: boolean;
}

export interface StoredAlert {
  id: string;
  serverId: string;
  serverName: string;
  timestamp: number;
  playerName: string;
  playerUuid: string;
  checkId: string;
  checkName: string;
  domain: string;
  vl: number;
  maxVl: number;
  severity: Severity;
  message: string;
  ping: number;
  tps: number;
  evidence: number;
  threshold: number;
  debug: Record<string, string>;
}

export interface ServerRecord {
  id: string;
  name: string;
  url: string;
  credentialId?: string;
}

export const VIEWS = [
  "overview",
  "alerts",
  "players",
  "checks",
  "analytics",
  "servers",
  "audit",
  "access",
  "logs",
  "settings",
] as const;

export type ViewId = (typeof VIEWS)[number];
