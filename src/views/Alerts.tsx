import { Fragment, useMemo, useState } from "react";
import { Badge, Empty, alertCsv } from "../ui/bits";
import { PlayerAvatar } from "../ui/PlayerAvatar";
import { useApp } from "../state/store";
import { formatAgo, formatExact } from "../lib/format";
import { matchesAlert, parseQuery } from "../protocol/search";
import type { Severity } from "../protocol/types";

export function AlertsPage() {
  const alerts = useApp((s) => s.alerts);
  const search = useApp((s) => s.search);
  const setSearch = useApp((s) => s.setSearch);
  const livePaused = useApp((s) => s.livePaused);
  const toggleLive = useApp((s) => s.toggleLive);
  const selected = useApp((s) => s.selectedAlertId);
  const selectAlert = useApp((s) => s.selectAlert);
  const investigate = useApp((s) => s.investigate);
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [minVl, setMinVl] = useState(0);

  const visible = useMemo(() => {
    const q = parseQuery(search);
    return alerts.filter((a) => {
      if (severity !== "ALL" && a.severity !== severity) return false;
      if (a.vl < minVl) return false;
      return matchesAlert(a, q);
    });
  }, [alerts, search, severity, minVl]);

  const selectedAlert = alerts.find((a) => a.id === selected) ?? null;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Live Alerts</h1>
          <p>Real-time NightWatch detections. Events stay here when you change pages.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={toggleLive}>{livePaused ? "Resume" : "Pause feed"}</button>
          <button className="btn" onClick={() => copy(visible.map((a) => `${a.playerName} ${a.checkName} VL ${a.vl}`).join("\n"))}>Copy</button>
          <button className="btn" onClick={() => download("alerts.csv", alertCsv(visible))}>Export CSV</button>
          <button className="btn" onClick={() => download("alerts.json", JSON.stringify(visible, null, 2))}>Export JSON</button>
        </div>
      </div>
      <div className="filters">
        <input className="search-input" style={{ maxWidth: 360 }} placeholder="Steve, check:reach, severity:critical, vl:>10" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "ALL")}>
          <option value="ALL">All severities</option>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="muted">Min VL <input type="number" min={0} value={minVl} onChange={(e) => setMinVl(Number(e.target.value))} style={{ width: 64 }} /></label>
        <span className="muted">{visible.length} shown{livePaused ? " · live view paused (events still stored)" : ""}</span>
      </div>
      {visible.length === 0 ? (
        <Empty title="No alerts yet" body="Night Panel is connected and monitoring your server. New Anti-Cheat detections will appear here automatically." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: "calc(100vh - 220px)" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th><th>Player</th><th>Check</th><th>VL</th><th>Ping</th><th>TPS</th><th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 400).map((alert) => (
                <tr key={alert.id} className={alert.id === selected ? "active" : ""} onClick={() => selectAlert(alert.id)}>
                  <td title={formatExact(alert.timestamp)}>{formatAgo(alert.timestamp)}</td>
                  <td>
                    <span className="player-cell">
                      <PlayerAvatar name={alert.playerName} uuid={alert.playerUuid} size={24} />
                      {alert.playerName}
                    </span>
                  </td>
                  <td>{alert.checkName}</td>
                  <td>{(alert.vl ?? 0).toFixed(1)}</td>
                  <td>{alert.ping}ms</td>
                  <td>{(alert.tps ?? 0).toFixed(1)}</td>
                  <td><Badge severity={alert.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedAlert ? (
        <aside className="drawer" aria-label="Alert details">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Detection</h2>
            <button className="btn ghost" onClick={() => selectAlert(null)}>Close</button>
          </div>
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>Player</dt>
            <dd>
              <span className="player-cell">
                <PlayerAvatar name={selectedAlert.playerName} uuid={selectedAlert.playerUuid} size={28} />
                {selectedAlert.playerName}
              </span>
            </dd>
            <dt>UUID</dt><dd>{selectedAlert.playerUuid || "—"}</dd>
            <dt>Check</dt><dd>{selectedAlert.checkName} ({selectedAlert.checkId})</dd>
            <dt>Domain</dt><dd>{selectedAlert.domain}</dd>
            <dt>Violation</dt><dd>{selectedAlert.vl.toFixed(2)} / {selectedAlert.maxVl.toFixed(0)}</dd>
            <dt>Ping</dt><dd>{selectedAlert.ping}ms</dd>
            <dt>TPS</dt><dd>{selectedAlert.tps.toFixed(2)}</dd>
            <dt>Server</dt><dd>{selectedAlert.serverName}</dd>
            <dt>Time</dt><dd>{formatExact(selectedAlert.timestamp)}</dd>
            <dt>Message</dt><dd>{selectedAlert.message || "—"}</dd>
          </dl>
          {Object.keys(selectedAlert.debug).length > 0 ? (
            <>
              <h2>Debug</h2>
              <dl className="kv">
                {Object.entries(selectedAlert.debug).map(([k, v]) => (
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </>
          ) : null}
          <details>
            <summary className="muted">Raw payload</summary>
            <pre className="debug">{JSON.stringify(selectedAlert, null, 2)}</pre>
          </details>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => copy(selectedAlert.playerUuid)}>Copy UUID</button>
            <button className="btn" onClick={() => copy(JSON.stringify(selectedAlert, null, 2))}>Copy alert</button>
            <button className="btn primary" onClick={() => investigate(selectedAlert.playerUuid || selectedAlert.playerName)}>Investigate</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}

function copy(text: string): void {
  void navigator.clipboard.writeText(text);
}

function download(name: string, body: string): void {
  const blob = new Blob([body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
