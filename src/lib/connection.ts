import { decode, encode, ProtocolError } from "../protocol/codec";
import { hmacHex } from "../protocol/hmac";
import type {
  AlertPayload,
  AuditEntry,
  AuthOkData,
  CheckInfo,
  ConnectionState,
  CredentialSummary,
  Envelope,
  HelloData,
  PlayerSnapshot,
  ServerInfo,
  StatusPayload,
} from "../protocol/types";

export interface ConnectionHandlers {
  onState: (state: ConnectionState, detail?: string) => void;
  onHello: (hello: HelloData) => void;
  onReady: (auth: AuthOkData, rttMs: number) => void;
  onAlert: (envelope: Envelope<AlertPayload>) => void;
  onPunishment: (envelope: Envelope) => void;
  onJoin: (envelope: Envelope) => void;
  onQuit: (envelope: Envelope) => void;
  onStatus: (status: StatusPayload) => void;
  onPlayers: (players: PlayerSnapshot[]) => void;
  onChecks: (checks: CheckInfo[]) => void;
  onAudit: (entries: AuditEntry[]) => void;
  onCredentials: (credentials: CredentialSummary[]) => void;
  onLog: (level: "info" | "warn" | "error", message: string) => void;
  onPong: (rttMs: number) => void;
  onTokenProvisioned: (token: string) => void;
}

export class ServerConnection {
  readonly localId: string;
  url: string;
  private token: string;
  private pairCode: string | null;
  private credentialId: string;
  private socket: WebSocket | null = null;
  private handlers: ConnectionHandlers;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private backoffMs = 1000;
  private stopped = false;
  private lastPingAt = 0;
  private seen = new Set<string>();
  private pending = new Map<string, {
    resolve: (envelope: Envelope) => void;
    reject: (error: Error) => void;
    timer: number;
  }>();
  private serverId = "";
  private handshakeStarted = 0;

  constructor(
    localId: string,
    url: string,
    token: string,
    handlers: ConnectionHandlers,
    pairCode?: string,
    credentialId?: string,
  ) {
    this.localId = localId;
    this.url = url;
    this.token = token;
    this.pairCode = pairCode ?? null;
    this.credentialId = credentialId ?? "";
    this.handlers = handlers;
  }

  setToken(token: string): void {
    this.token = token;
  }

  start(): void {
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.rejectPending("connection closed");
    this.handlers.onState("offline");
  }

  send(type: string, data: Record<string, unknown> = {}, requestId?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(encode(type, data, this.serverId, requestId));
  }

  request(type: string, data: Record<string, unknown> = {}): Promise<Envelope> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("server is not connected"));
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("request timed out"));
      }, 8000);
      this.pending.set(requestId, { resolve, reject, timer });
      this.send(type, data, requestId);
    });
  }

  private open(): void {
    this.clearTimers();
    this.handlers.onState(this.backoffMs > 1000 ? "reconnecting" : "connecting");
    this.handshakeStarted = Date.now();
    try {
      this.socket = new WebSocket(this.url);
    } catch (error) {
      this.handlers.onLog("error", humanError(error));
      this.scheduleReconnect();
      return;
    }
    this.socket.onopen = () => {
      this.handlers.onLog("info", `Socket open ${this.url}`);
    };
    this.socket.onmessage = (event) => {
      void this.onFrame(String(event.data));
    };
    this.socket.onerror = () => {
      this.handlers.onLog("warn", "WebSocket error");
    };
    this.socket.onclose = () => {
      this.clearPing();
      this.rejectPending("connection lost");
      if (!this.stopped) {
        this.handlers.onState("reconnecting", "Connection lost. Reconnecting automatically…");
        this.scheduleReconnect();
      }
    };
  }

  private async onFrame(raw: string): Promise<void> {
    let envelope: Envelope;
    try {
      envelope = decode(raw);
    } catch (error) {
      if (error instanceof ProtocolError && error.errorType === "error.protocol_mismatch") {
        this.handlers.onState(
          "protocol-mismatch",
          `Server protocol: ${String(error.extra.serverProtocol ?? "?")}\nNight Panel protocol: 1\nThis Night Panel version is not compatible with this Anti-Cheat version.`,
        );
        this.stopped = true;
        this.socket?.close();
        return;
      }
      this.handlers.onLog("warn", "Ignored malformed frame");
      return;
    }
    if (envelope.requestId && this.pending.has(envelope.requestId)) {
      const pending = this.pending.get(envelope.requestId);
      this.pending.delete(envelope.requestId);
      if (pending) {
        window.clearTimeout(pending.timer);
        if (envelope.type.startsWith("error.")) {
          const message = String((envelope.data as { message?: string }).message ?? envelope.type);
          pending.reject(new Error(message));
        } else {
          pending.resolve(envelope);
        }
      }
    }
    switch (envelope.type) {
      case "session.hello":
        await this.authenticate(envelope.data as unknown as HelloData);
        break;
      case "session.auth_ok":
        this.onAuthOk(envelope.data as unknown as AuthOkData);
        break;
      case "session.auth_fail":
        this.handlers.onState("auth-failed", "Authentication failed. Check the token or pairing code.");
        this.stopped = true;
        this.socket?.close();
        break;
      case "error.protocol_mismatch":
        this.handlers.onState(
          "protocol-mismatch",
          `Server protocol: ${String((envelope.data as { serverProtocol?: number }).serverProtocol ?? "?")}\nNight Panel protocol: 1\nThis Night Panel version is not compatible with this Anti-Cheat version.`,
        );
        this.stopped = true;
        this.socket?.close();
        break;
      case "error.rate_limited":
        this.handlers.onState("auth-failed", "Too many authentication attempts. Wait a minute and retry.");
        break;
      case "session.pong": {
        const sentAt = Number((envelope.data as { sentAt?: number }).sentAt ?? this.lastPingAt);
        this.handlers.onPong(Math.max(0, Date.now() - sentAt));
        break;
      }
      case "player.alert":
      case "check.debug":
        this.emitAlert(envelope as unknown as Envelope<AlertPayload>);
        break;
      case "player.punishment":
        this.handlers.onPunishment(envelope);
        break;
      case "player.join":
        this.handlers.onJoin(envelope);
        break;
      case "player.quit":
        this.handlers.onQuit(envelope);
        break;
      case "server.performance":
      case "ok.status":
        this.handlers.onStatus(envelope.data as unknown as StatusPayload);
        break;
      case "ok.players":
        this.handlers.onPlayers(((envelope.data as { players?: PlayerSnapshot[] }).players) ?? []);
        break;
      case "ok.checks":
      case "anticheat.reload":
        if (Array.isArray((envelope.data as { checks?: CheckInfo[] }).checks)) {
          this.handlers.onChecks((envelope.data as { checks: CheckInfo[] }).checks);
        }
        break;
      case "ok.audit":
        this.handlers.onAudit(((envelope.data as { entries?: AuditEntry[] }).entries) ?? []);
        break;
      case "audit.event":
        this.handlers.onAudit([envelope.data as unknown as AuditEntry]);
        break;
      case "ok.credentials":
        this.handlers.onCredentials(
          ((envelope.data as { credentials?: CredentialSummary[] }).credentials) ?? [],
        );
        break;
      case "anticheat.status":
        this.handlers.onStatus(envelope.data as unknown as StatusPayload);
        break;
      default:
        break;
    }
  }

  private async authenticate(hello: HelloData): Promise<void> {
    this.handlers.onHello(hello);
    this.serverId = "";
    const data: Record<string, unknown> = {};
    if (this.pairCode) {
      data.pairCode = this.pairCode.replace(/\s+/g, "");
    } else {
      if (this.credentialId) {
        data.credentialId = this.credentialId;
      }
      data.hmac = await hmacHex(this.token, hello.nonce);
    }
    this.send("session.auth", data);
  }

  private onAuthOk(auth: AuthOkData): void {
    this.serverId = auth.server.serverId;
    this.backoffMs = 1000;
    this.pairCode = null;
    if (auth.token) {
      this.token = auth.token;
      this.handlers.onTokenProvisioned(auth.token);
    }
    this.handlers.onReady(auth, Date.now() - this.handshakeStarted);
    this.handlers.onState("connected");
    this.startPing();
    void this.request("get.status").catch(() => undefined);
    void this.request("get.players").catch(() => undefined);
  }

  private emitAlert(envelope: Envelope<AlertPayload>): void {
    const key = [
      envelope.serverId,
      envelope.type,
      envelope.timestamp,
      envelope.data.player?.uuid ?? "",
      envelope.data.check?.id ?? "",
    ].join("|");
    if (this.seen.has(key)) {
      return;
    }
    this.seen.add(key);
    if (this.seen.size > 4000) {
      this.seen.clear();
    }
    this.handlers.onAlert(envelope);
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = window.setInterval(() => {
      this.lastPingAt = Date.now();
      this.send("session.ping", { sentAt: this.lastPingAt });
    }, 15000);
  }

  private scheduleReconnect(): void {
    if (this.stopped) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => this.open(), this.backoffMs);
    this.backoffMs = Math.min(30000, this.backoffMs * 2);
  }

  private clearPing(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearPing();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private rejectPending(message: string): void {
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }
}

export function humanError(error: unknown): string {
  if (error instanceof ProtocolError) {
    return error.message;
  }
  if (error instanceof Error) {
    const text = error.message;
    if (/failed to (connect|fetch)|connection refused|network/i.test(text)) {
      return "Could not reach the Minecraft server. Is NightWatch Pro running with Night Panel enabled?";
    }
    return text;
  }
  return "Unknown error";
}

export function formatServerLabel(info: ServerInfo): string {
  return `${info.serverName} · ${info.serverSoftware} ${info.minecraftVersion}`;
}
