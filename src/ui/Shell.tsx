import { useEffect, useMemo, type ReactElement } from "react";
import { useApp } from "../state/store";
import { formatAgo } from "../lib/format";
import { VIEWS, type ViewId } from "../protocol/types";
import { parseQuery, matchesAlert } from "../protocol/search";
import { ErrorBoundary } from "./ErrorBoundary";
import { AlertsPage } from "../views/Alerts";
import { OverviewPage } from "../views/Overview";
import { PlayersPage } from "../views/Players";
import { ChecksPage } from "../views/Checks";
import { AnalyticsPage } from "../views/Analytics";
import { ServersPage } from "../views/Servers";
import { LogsPage } from "../views/Logs";
import { SettingsPage } from "../views/Settings";
import { AuditPage } from "../views/Audit";
import { AccessPage } from "../views/Access";

const LABELS: Record<ViewId, string> = {
  overview: "Overview",
  alerts: "Live Alerts",
  players: "Players",
  checks: "Checks",
  analytics: "Analytics",
  servers: "Servers",
  audit: "Audit",
  access: "Access",
  logs: "Logs",
  settings: "Settings",
};

const ICONS: Record<ViewId, string> = {
  overview: "◫",
  alerts: "⚠",
  players: "◎",
  checks: "✓",
  analytics: "⌁",
  servers: "▣",
  audit: "≡",
  access: "♙",
  logs: ">_",
  settings: "⚙",
};

export function Shell() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const servers = useApp((s) => s.servers);
  const activeId = useApp((s) => s.activeServerId);
  const runtimes = useApp((s) => s.runtimes);
  const commandOpen = useApp((s) => s.commandOpen);
  const setCommandOpen = useApp((s) => s.setCommandOpen);
  const search = useApp((s) => s.search);
  const setSearch = useApp((s) => s.setSearch);
  const toasts = useApp((s) => s.toasts);
  const startWizard = useApp((s) => s.startWizard);

  const active = servers.find((s) => s.id === activeId);
  const runtime = activeId ? runtimes[activeId] : undefined;
  const connected = runtime?.state === "connected";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setView("settings");
      }
      if ((event.ctrlKey || event.metaKey) && event.key >= "1" && event.key <= "7") {
        event.preventDefault();
        setView(VIEWS[Number(event.key) - 1] ?? "overview");
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen, setView]);

  const Page = PAGES[view];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.png" alt="" width={22} height={22} />
          <div className="wordmark">
            Night Panel
            <span>Anti-Cheat Intelligence</span>
          </div>
        </div>
        <div className="spacer" />
        <strong>{active?.name ?? "No server"}</strong>
        <span className="status-pill">
          <span className={`dot ${connected ? "ok" : runtime?.state === "reconnecting" || runtime?.state === "connecting" ? "spin" : "crit"}`} />
          {statusLabel(runtime?.state, runtime?.rttMs)}
        </span>
      </header>
      <div className="app-body">
        <nav className="nav" aria-label="Primary">
          {VIEWS.map((id, index) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)} title={LABELS[id]} aria-label={LABELS[id]}>
              <span className="nav-icon" aria-hidden="true">{ICONS[id]}</span>
              <span className="label">{LABELS[id]}</span>
              <span className="k">{index < 7 ? `Ctrl+${index + 1}` : ""}</span>
            </button>
          ))}
          <button className="nav-collapse ghost btn" onClick={startWizard} title="Add server" aria-label="Add server"><span className="nav-icon" aria-hidden="true">+</span><span className="label">Add server</span></button>
        </nav>
        <main className="main">
          <ErrorBoundary>{Page ? <Page /> : null}</ErrorBoundary>
        </main>
      </div>
      <footer className="footer">
        <span>Night Panel 1.0.0</span>
        <span>Protocol v1</span>
        <span>{typeof runtime?.status?.tps === "number" ? `${runtime.status.tps.toFixed(1)} TPS` : "—"}</span>
        <span>{typeof runtime?.status?.playerCount === "number" ? `${runtime.status.playerCount} players` : ""}</span>
      </footer>
      {commandOpen ? (
        <div className="palette" role="dialog" aria-label="Search">
          <input
            autoFocus
            className="search-input"
            placeholder="Search players, checks, server:survival severity:critical vl:>10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <PaletteHits />
        </div>
      ) : null}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
}

function PaletteHits() {
  const search = useApp((s) => s.search);
  const alerts = useApp((s) => s.alerts);
  const setView = useApp((s) => s.setView);
  const selectAlert = useApp((s) => s.selectAlert);
  const setCommandOpen = useApp((s) => s.setCommandOpen);
  const hits = useMemo(() => {
    const q = parseQuery(search);
    return alerts.filter((a) => matchesAlert(a, q)).slice(0, 8);
  }, [alerts, search]);
  if (hits.length === 0) {
    return <div className="hit muted">No matching alerts</div>;
  }
  return (
    <>
      {hits.map((alert) => (
        <button
          key={alert.id}
          className="hit"
          onClick={() => {
            selectAlert(alert.id);
            setView("alerts");
            setCommandOpen(false);
          }}
        >
          {alert.playerName} · {alert.checkName} · {formatAgo(alert.timestamp)}
        </button>
      ))}
    </>
  );
}

const PAGES: Record<ViewId, () => ReactElement> = {
  overview: OverviewPage,
  alerts: AlertsPage,
  players: PlayersPage,
  checks: ChecksPage,
  analytics: AnalyticsPage,
  servers: ServersPage,
  audit: AuditPage,
  access: AccessPage,
  logs: LogsPage,
  settings: SettingsPage,
};

function statusLabel(state: string | undefined, rtt?: number): string {
  switch (state) {
    case "connected":
      return `Connected${typeof rtt === "number" && rtt > 0 ? ` · ${Math.round(rtt)}ms` : ""}`;
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "auth-failed":
      return "Authentication failed";
    case "protocol-mismatch":
      return "Protocol mismatch";
    default:
      return "Offline";
  }
}
