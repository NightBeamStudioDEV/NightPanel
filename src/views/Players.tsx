import { useMemo, useState } from "react";
import { Badge, Bars, Empty } from "../ui/bits";
import { useApp } from "../state/store";
import { useActiveAlerts, useActiveRuntime } from "../state/hooks";
import { formatAgo } from "../lib/format";
import { investigationScore, scoreBand } from "../protocol/risk";

export function PlayersPage() {
  const activeId = useApp((s) => s.activeServerId);
  const runtime = useActiveRuntime();
  const alerts = useActiveAlerts();
  const investigating = useApp((s) => s.investigatingUuid);
  const investigate = useApp((s) => s.investigate);
  const watchlist = useApp((s) => s.watchlist);
  const toggleWatch = useApp((s) => s.toggleWatch);
  const requestAction = useApp((s) => s.requestPlayerAction);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const players = runtime?.players ?? [];

  const selected = useMemo(() => {
    if (!investigating) return null;
    return players.find((p) => p.uuid === investigating || p.name === investigating)
      ?? { uuid: investigating, name: investigating, ping: 0, totalVl: 0, alerts: 0, joinTime: Date.now(), perCheckVl: {} };
  }, [investigating, players]);

  const timeline = alerts.filter((a) => selected && (a.playerUuid === selected.uuid || a.playerName === selected.name));
  const score = investigationScore(timeline);
  const breakdown = Object.entries(
    timeline.reduce<Record<string, number>>((acc, a) => {
      acc[a.checkName] = (acc[a.checkName] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">Live roster</div>
          <h1>Players</h1>
          <p>Online session plus investigation priority — not a cheat verdict.</p>
        </div>
      </div>
      <div className="grid-2">
        <div className="card" style={{ padding: 0 }}>
          {players.length === 0 ? (
            <Empty title="No players online" body="When players join the connected server they will appear here." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th><th>Ping</th><th>Alerts</th><th>VL</th><th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const playerAlerts = alerts.filter((a) => a.playerUuid === player.uuid || a.playerName === player.name);
                  const risk = investigationScore(playerAlerts);
                  return (
                    <tr key={player.uuid} className={investigating === player.uuid ? "active" : ""} onClick={() => investigate(player.uuid)}>
                      <td>{player.name}{watchlist.includes(player.name) ? " ★" : ""}</td>
                      <td>{player.ping}ms</td>
                      <td>{player.alerts}</td>
                      <td>{player.totalVl.toFixed(1)}</td>
                      <td>{risk} · {scoreBand(risk)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          {selected ? (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, letterSpacing: 0, textTransform: "none", fontSize: 18, color: "var(--text)" }}>{selected.name}</h2>
                <button className="btn" onClick={() => toggleWatch(selected.name)}>
                  {watchlist.includes(selected.name) ? "Unwatch" : "Watch"}
                </button>
              </div>
              <p className="muted">{selected.uuid}</p>
              <div className="grid-4" style={{ margin: "12px 0" }}>
                <div className="metric">Priority<b>{score} / 100</b><span className="muted">{scoreBand(score)}</span></div>
                <div className="metric">Ping<b>{selected.ping}ms</b></div>
                <div className="metric">Alerts<b>{timeline.length}</b></div>
                <div className="metric">Total VL<b>{selected.totalVl.toFixed(1)}</b></div>
              </div>
              <p className="muted">Investigation priority is a local ranking for review order. It is not proof of cheating.</p>
              <h2>Investigating</h2>
              {timeline.length === 0 ? (
                <p className="muted">No alerts for this player yet.</p>
              ) : (
                <div>
                  {timeline.slice(0, 40).map((alert) => (
                    <div key={alert.id} className="row" style={{ justifyContent: "space-between", padding: "4px 0" }}>
                      <span className="muted">{formatAgo(alert.timestamp)}</span>
                      <span>{alert.checkName}</span>
                      <span>VL {alert.vl.toFixed(1)}</span>
                      <Badge severity={alert.severity} />
                    </div>
                  ))}
                </div>
              )}
              <h2>Check breakdown</h2>
              <Bars items={breakdown.slice(0, 8)} />
              <div className="action-panel">
                <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>Operator actions</h2><span className="role-chip">{runtime?.authorization?.role ?? "LEGACY"}</span></div>
                <div className="field"><label>Required reason</label><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason recorded in the server audit trail" /></div>
                <div className="action-grid">
                  {([
                    ["warn", "Warn", "player.warn"],
                    ["kick", "Kick", "player.kick"],
                    ["reset_vl", "Reset VL", "player.reset_vl"],
                    ["temporary_exemption", "Exempt 15m", "player.exempt"],
                    ["revoke_exemption", "Revoke exemption", "player.exempt"],
                    ["setback", "Set back", "player.setback"],
                    ["ban", "Ban", "player.ban"],
                  ] as const).map(([action, label, permission]) => {
                    const allowed = runtime?.authorization?.role === "ADMIN" || (runtime?.authorization?.permissions as string[] | undefined)?.includes(permission);
                    return <button key={action} className={`btn ${action === "ban" || action === "kick" ? "danger" : ""}`} disabled={!allowed || !activeId || !reason.trim() || Boolean(busy)} title={allowed ? "" : `Requires ${permission}`} onClick={() => {
                      if (!activeId || !selected) return;
                      setBusy(action);
                      setActionError("");
                      void requestAction(activeId, {
                        action: action as "warn" | "kick" | "reset_vl" | "temporary_exemption" | "revoke_exemption" | "setback" | "ban",
                        uuid: selected.uuid,
                        reason: reason.trim(),
                        durationSeconds: action === "temporary_exemption" ? 900 : undefined,
                      }).then(() => setReason("")).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Action failed")).finally(() => setBusy(""));
                    }}>{busy === action ? "Working…" : label}</button>;
                  })}
                </div>
                {actionError ? <p className="danger-text">{actionError}</p> : null}
                <p className="muted">Actions are permission checked and audited by the server. NightPanel never sends arbitrary console commands.</p>
              </div>
            </>
          ) : (
            <Empty title="Select a player" body="Open a profile to inspect their session, timeline, and investigation priority." />
          )}
        </div>
      </div>
    </>
  );
}
