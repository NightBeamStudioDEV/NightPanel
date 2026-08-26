import { create } from "zustand";
import { ServerConnection } from "../lib/connection";
import {
  clearPersistedAlerts,
  loadPersistedAlerts,
  nativeNotify,
  newId,
  persistAlert,
  secretDelete,
  secretGet,
  secretSet,
} from "../lib/platform";
import { SEVERITY_RANK } from "../lib/format";
import type {
  AlertPayload,
  AuditEntry,
  AuthorizationInfo,
  CheckInfo,
  ConnectionState,
  CredentialSummary,
  Envelope,
  PlayerActionRequest,
  PlayerSnapshot,
  ServerInfo,
  ServerRecord,
  Severity,
  StatusPayload,
  StoredAlert,
  ViewId,
  WebSocketMigration,
} from "../protocol/types";

export interface LogLine {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Settings {
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  theme: "dark" | "light" | "system";
  compact: boolean;
  notifyEnabled: boolean;
  notifyMinSeverity: Severity;
  notifyCooldownMs: number;
  notifyGroupRepeats: boolean;
  notifySounds: boolean;
  retentionDays: number | null;
  debug: boolean;
  pauseNotifications: boolean;
  reducedMotion: boolean;
}

export interface ServerRuntime {
  state: ConnectionState;
  detail: string;
  rttMs: number;
  info: ServerInfo | null;
  status: StatusPayload | null;
  checks: CheckInfo[];
  players: PlayerSnapshot[];
  authorization: AuthorizationInfo | null;
  capabilities: string[];
  audit: AuditEntry[];
  credentials: CredentialSummary[];
  performance: { timestamp: number; status: StatusPayload }[];
  pendingMigration: WebSocketMigration | null;
  handshake: string[];
}

interface AppState {
  ready: boolean;
  view: ViewId;
  servers: ServerRecord[];
  activeServerId: string | null;
  runtimes: Record<string, ServerRuntime>;
  alerts: StoredAlert[];
  livePaused: boolean;
  selectedAlertId: string | null;
  investigatingUuid: string | null;
  watchlist: string[];
  logs: LogLine[];
  settings: Settings;
  search: string;
  commandOpen: boolean;
  wizard: WizardState | null;
  toasts: { id: string; text: string }[];
  hydrate: () => Promise<void>;
  setView: (view: ViewId) => void;
  setSearch: (value: string) => void;
  setCommandOpen: (open: boolean) => void;
  startWizard: () => void;
  cancelWizard: () => void;
  connectNew: (input: { name: string; url: string; token: string; pairCode: string }) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  reconnectServer: (id: string) => Promise<void>;
  updateServer: (id: string, patch: Partial<Pick<ServerRecord, "name" | "url">>) => Promise<void>;
  setActiveServer: (id: string) => void;
  toggleLive: () => void;
  selectAlert: (id: string | null) => void;
  investigate: (uuid: string | null) => void;
  toggleWatch: (name: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  pushToast: (text: string) => void;
  clearAlerts: () => Promise<void>;
  exportAlerts: (alerts: StoredAlert[]) => string;
  requestToggleCheck: (serverId: string, checkId: string, enabled: boolean) => Promise<void>;
  requestReload: (serverId: string) => Promise<void>;
  requestPlayerAction: (serverId: string, action: PlayerActionRequest) => Promise<void>;
  refreshAudit: (serverId: string) => Promise<void>;
  refreshCredentials: (serverId: string) => Promise<void>;
  createPairingCode: (serverId: string, role: string, label: string) => Promise<string>;
  revokeCredential: (serverId: string, credentialId: string) => Promise<void>;
  requestPortMigration: (serverId: string, port: number) => Promise<void>;
}

interface WizardState {
  name: string;
  url: string;
  token: string;
  pairCode: string;
  stages: { id: string; label: string; ok: boolean }[];
  error: string;
}

const SETTINGS_KEY = "night-panel.settings";
const SERVERS_KEY = "night-panel.servers";
const WATCH_KEY = "night-panel.watchlist";

const defaultSettings = (): Settings => ({
  launchOnStartup: false,
  minimizeToTray: true,
  closeToTray: true,
  theme: "dark",
  compact: false,
  notifyEnabled: true,
  notifyMinSeverity: "HIGH",
  notifyCooldownMs: 5000,
  notifyGroupRepeats: true,
  notifySounds: false,
  retentionDays: 30,
  debug: false,
  pauseNotifications: false,
  reducedMotion: false,
});

const emptyRuntime = (): ServerRuntime => ({
  state: "offline",
  detail: "",
  rttMs: 0,
  info: null,
  status: null,
  checks: [],
  players: [],
  authorization: null,
  capabilities: [],
  audit: [],
  credentials: [],
  performance: [],
  pendingMigration: null,
  handshake: [],
});

const connections = new Map<string, ServerConnection>();
let lastNotifyAt = 0;
let lastNotifyKey = "";

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  view: "overview",
  servers: [],
  activeServerId: null,
  runtimes: {},
  alerts: [],
  livePaused: false,
  selectedAlertId: null,
  investigatingUuid: null,
  watchlist: [],
  logs: [],
  settings: defaultSettings(),
  search: "",
  commandOpen: false,
  wizard: null,
  toasts: [],

  hydrate: async () => {
    const settings = {
      ...defaultSettings(),
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>),
    };
    const servers = JSON.parse(localStorage.getItem(SERVERS_KEY) ?? "[]") as ServerRecord[];
    const watchlist = JSON.parse(localStorage.getItem(WATCH_KEY) ?? "[]") as string[];
    const alerts = await loadPersistedAlerts();
    set({
      settings,
      servers,
      watchlist,
      alerts,
      activeServerId: servers[0]?.id ?? null,
      ready: true,
    });
    for (const server of servers) {
      const token = (await secretGet(server.id)) ?? "";
      attachConnection(server, token, get, set);
    }
  },

  setView: (view) => set({ view, commandOpen: false }),
  setSearch: (search) => set({ search }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  startWizard: () =>
    set({
      wizard: {
        name: "",
        url: "ws://127.0.0.1:8765",
        token: "",
        pairCode: "",
        stages: [],
        error: "",
      },
    }),
  cancelWizard: () => set({ wizard: null }),

  connectNew: async (input) => {
    const id = newId();
    const server: ServerRecord = {
      id,
      name: input.name.trim() || "Minecraft Server",
      url: input.url.trim(),
    };
    if (input.token) {
      await secretSet(id, input.token);
    }
    const servers = [...get().servers, server];
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
    set({ servers, activeServerId: id, wizard: null, view: "overview" });
    attachConnection(server, input.token, get, set, input.pairCode || undefined);
    get().pushToast(`Connecting to ${server.name}`);
  },

  disconnectServer: async (id) => {
    connections.get(id)?.stop();
    connections.delete(id);
    await secretDelete(id);
    const servers = get().servers.filter((s) => s.id !== id);
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
    const runtimes = { ...get().runtimes };
    delete runtimes[id];
    set({
      servers,
      runtimes,
      activeServerId: servers[0]?.id ?? null,
    });
  },

  reconnectServer: async (id) => {
    connections.get(id)?.stop();
    const server = get().servers.find((s) => s.id === id);
    if (!server) return;
    const token = (await secretGet(id)) ?? "";
    attachConnection(server, token, get, set);
  },

  updateServer: async (id, patch) => {
    const servers = get().servers.map((server) =>
      server.id === id ? { ...server, ...patch } : server,
    );
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
    set({ servers });
    await get().reconnectServer(id);
  },

  setActiveServer: (id) => set({ activeServerId: id }),
  toggleLive: () => set({ livePaused: !get().livePaused }),
  selectAlert: (id) => set({ selectedAlertId: id }),
  investigate: (uuid) => set({ investigatingUuid: uuid, view: "players" }),
  toggleWatch: (name) => {
    const current = get().watchlist;
    const watchlist = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist));
    set({ watchlist });
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    set({ settings });
  },
  pushToast: (text) => {
    const id = newId();
    set({ toasts: [...get().toasts, { id, text }] });
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 3200);
  },
  clearAlerts: async () => {
    await clearPersistedAlerts();
    set({ alerts: [], selectedAlertId: null });
  },
  exportAlerts: (alerts) => JSON.stringify(alerts, null, 2),
  requestToggleCheck: async (serverId, checkId, enabled) => {
    const conn = connections.get(serverId);
    if (!conn) return;
    await conn.request("checks.toggle", { id: checkId, enabled });
    get().pushToast(`${enabled ? "Enabled" : "Disabled"} ${checkId}`);
  },
  requestReload: async (serverId) => {
    const conn = connections.get(serverId);
    if (!conn) return;
    await conn.request("anticheat.reload", {});
    get().pushToast("Requested anticheat reload");
  },
  requestPlayerAction: async (serverId, action) => {
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    await conn.request("player.action", action as unknown as Record<string, unknown>);
    get().pushToast(`${action.action.replaceAll("_", " ")} completed`);
    await conn.request("get.players");
  },
  refreshAudit: async (serverId) => {
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    await conn.request("get.audit", { limit: 200 });
  },
  refreshCredentials: async (serverId) => {
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    await conn.request("get.credentials");
  },
  createPairingCode: async (serverId, role, label) => {
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    const response = await conn.request("credentials.create_pair", { role, label });
    return String((response.data as { pairCode?: string }).pairCode ?? "");
  },
  revokeCredential: async (serverId, credentialId) => {
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    await conn.request("credentials.revoke", { credentialId });
    await get().refreshCredentials(serverId);
  },
  requestPortMigration: async (serverId, port) => {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error("port must be between 1024 and 65535");
    }
    const conn = connections.get(serverId);
    if (!conn) throw new Error("server is not connected");
    const response = await conn.request("settings.websocket.prepare", { port });
    const migration = response.data as unknown as WebSocketMigration;
    patchRuntime(set, get, serverId, { pendingMigration: migration });
    const servers = get().servers.map((server) =>
      server.id === serverId ? { ...server, url: migration.url } : server,
    );
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
    set({ servers });
    await get().reconnectServer(serverId);
  },
}));

function attachConnection(
  server: ServerRecord,
  token: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void,
  pairCode?: string,
): void {
  connections.get(server.id)?.stop();
  patchRuntime(set, get, server.id, { state: "connecting", handshake: [] });
  const conn = new ServerConnection(server.id, server.url, token, {
    onState: (state, detail) => {
      patchRuntime(set, get, server.id, { state, detail: detail ?? "" });
      if (state === "connected") {
        log(set, get, "info", `Connected to ${server.name}`);
      } else if (state === "reconnecting") {
        log(set, get, "warn", `${server.name}: connection lost, reconnecting`);
      } else if (state === "auth-failed" || state === "protocol-mismatch") {
        log(set, get, "error", `${server.name}: ${detail ?? state}`);
      }
    },
    onHello: () => {
      patchRuntime(set, get, server.id, {
        handshake: ["WebSocket connection", "Authentication"],
      });
    },
    onReady: (auth, _rtt) => {
      if (auth.authorization?.credentialId) {
        const servers = get().servers.map((item) =>
          item.id === server.id
            ? { ...item, credentialId: auth.authorization?.credentialId }
            : item,
        );
        localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
        set({ servers });
      }
      patchRuntime(set, get, server.id, {
        info: auth.server,
        checks: auth.checks,
        authorization: auth.authorization ?? {
          credentialId: "legacy-admin",
          label: "Legacy administrator",
          role: "ADMIN",
          permissions: [],
        },
        capabilities: auth.capabilities ?? [],
        handshake: [
          "WebSocket connection",
          "Authentication",
          "Protocol compatibility",
          "Anti-Cheat detected",
          "Server information received",
        ],
        state: "connected",
      });
      const runtime = get().runtimes[server.id];
      if (runtime?.pendingMigration) {
        void conn.request("settings.websocket.commit", {
          migrationId: runtime.pendingMigration.migrationId,
        }).then(() => {
          patchRuntime(set, get, server.id, { pendingMigration: null });
          get().pushToast(`WebSocket moved to port ${runtime.pendingMigration?.port ?? ""}`);
        }).catch((error: unknown) => {
          log(set, get, "error", `${server.name}: port migration failed: ${error instanceof Error ? error.message : "unknown error"}`);
        });
      }
      if (auth.authorization?.permissions.includes("audit.read")) {
        void conn.request("get.audit", { limit: 200 }).catch(() => undefined);
      }
      if (auth.authorization?.permissions.includes("credentials.manage")) {
        void conn.request("get.credentials").catch(() => undefined);
      }
    },
    onAlert: (envelope) => {
      ingestAlert(server, envelope, get, set);
    },
    onPunishment: (envelope) => {
      log(set, get, "warn", `${server.name}: punishment ${(envelope.data as { action?: string }).action ?? ""}`);
    },
    onJoin: (envelope) => {
      const name = String((envelope.data as { player?: { name?: string } }).player?.name ?? "player");
      if (get().watchlist.includes(name) && !get().settings.pauseNotifications) {
        void nativeNotify("Watchlisted player joined", `${name} joined ${server.name}.`);
      }
    },
    onQuit: () => undefined,
    onStatus: (status) => {
      const current = get().runtimes[server.id];
      const merged = current?.status ? { ...current.status, ...status } : status;
      patchRuntime(set, get, server.id, {
        status: merged,
        performance: [
          ...(current?.performance ?? []),
          { timestamp: Date.now(), status: merged },
        ].slice(-1800),
      });
    },
    onPlayers: (players) => patchRuntime(set, get, server.id, { players }),
    onChecks: (checks) => patchRuntime(set, get, server.id, { checks }),
    onAudit: (entries) => {
      const current = get().runtimes[server.id]?.audit ?? [];
      const byId = new Map([...entries, ...current].map((entry) => [entry.id, entry]));
      patchRuntime(set, get, server.id, {
        audit: [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 500),
      });
    },
    onCredentials: (credentials) => patchRuntime(set, get, server.id, { credentials }),
    onLog: (level, message) => log(set, get, level, `${server.name}: ${message}`),
    onPong: (rttMs) => patchRuntime(set, get, server.id, { rttMs }),
    onTokenProvisioned: (value) => {
      void secretSet(server.id, value);
    },
  }, pairCode, server.credentialId);
  connections.set(server.id, conn);
  conn.start();
}

function ingestAlert(
  server: ServerRecord,
  envelope: Envelope<AlertPayload>,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void,
): void {
  const data = envelope.data;
  const alert: StoredAlert = {
    id: newId(),
    serverId: server.id,
    serverName: server.name,
    timestamp: envelope.timestamp,
    playerName: data.player.name ?? "unknown",
    playerUuid: data.player.uuid ?? "",
    checkId: data.check.id ?? "",
    checkName: data.check.name ?? data.check.id ?? "check",
    domain: data.check.domain ?? "",
    vl: data.check.violationLevel ?? 0,
    maxVl: data.check.maxViolationLevel ?? 0,
    severity: data.severity,
    message: data.message ?? "",
    ping: data.ping ?? 0,
    tps: data.tps ?? 20,
    evidence: data.evidence ?? 0,
    threshold: data.threshold ?? 0,
    debug: data.debug ?? {},
  };
  set({ alerts: [alert, ...get().alerts].slice(0, 8000) });
  void persistAlert(alert);
  maybeNotify(alert, server, get);
  if (get().watchlist.includes(alert.playerName) && !get().settings.pauseNotifications) {
    void nativeNotify(
      "Watchlisted player alert",
      `${alert.playerName} triggered ${alert.checkName} VL ${alert.vl.toFixed(1)}`,
    );
  }
}

function maybeNotify(alert: StoredAlert, server: ServerRecord, get: () => AppState): void {
  const settings = get().settings;
  if (!settings.notifyEnabled || settings.pauseNotifications) {
    return;
  }
  if (SEVERITY_RANK[alert.severity] < SEVERITY_RANK[settings.notifyMinSeverity]) {
    return;
  }
  const key = `${alert.playerName}|${alert.checkId}`;
  const now = Date.now();
  if (settings.notifyGroupRepeats && key === lastNotifyKey && now - lastNotifyAt < settings.notifyCooldownMs) {
    return;
  }
  if (now - lastNotifyAt < settings.notifyCooldownMs) {
    return;
  }
  lastNotifyAt = now;
  lastNotifyKey = key;
  void nativeNotify(
    "Night Panel",
    `${alert.severity} · ${alert.playerName} triggered ${alert.checkName}\nViolation Level: ${alert.vl.toFixed(1)}\nServer: ${server.name}`,
  );
}

function patchRuntime(
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  id: string,
  patch: Partial<ServerRuntime>,
): void {
  const current = get().runtimes[id] ?? emptyRuntime();
  set({ runtimes: { ...get().runtimes, [id]: { ...current, ...patch } } });
}

function log(
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  level: LogLine["level"],
  message: string,
): void {
  const line: LogLine = { id: newId(), timestamp: Date.now(), level, message };
  set({ logs: [line, ...get().logs].slice(0, 1000) });
}
