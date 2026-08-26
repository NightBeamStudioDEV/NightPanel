import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Empty } from "../ui/bits";
import { useApp } from "../state/store";
import { useActiveAlerts, useActiveRuntime } from "../state/hooks";
import { formatAgo, formatBytes, formatNumber } from "../lib/format";
import { investigationScore } from "../protocol/risk";

export function OverviewPage() {
  const activeId = useApp((s) => s.activeServerId);
  const runtime = useActiveRuntime();
  const alerts = useActiveAlerts();
  const selectAlert = useApp((s) => s.selectAlert);
  const setView = useApp((s) => s.setView);
  const startWizard = useApp((s) => s.startWizard);
  const now = Date.now();
  const hour = alerts.filter((a) => now - a.timestamp < 3600000);
  const day = alerts.filter((a) => now - a.timestamp < 86400000);
  const flagged = new Set(alerts.map((a) => a.playerUuid || a.playerName));
  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const topCheck = mode(alerts.map((a) => a.checkName));
  const buckets = bucket(hour, 12, 3600000);
  const activityData = buckets.map((value, index) => ({ index, alerts: value }));
  const healthData = (runtime?.performance ?? []).filter((_, index, all) => index % Math.max(1, Math.floor(all.length / 60)) === 0).map((sample) => ({
    time: new Date(sample.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    tps: sample.status.tps,
    mspt: sample.status.mspt,
  }));
  const status = runtime?.status;
  const enabled = runtime?.checks.filter((c) => c.enabled).length ?? 0;
  const disabled = (runtime?.checks.length ?? 0) - enabled;

  if (!activeId) {
    return (
      <Empty
        title="Connect a Minecraft server"
        body="Night Panel watches NightWatch Pro in real time. Add a server to see health and detections."
        action={<button className="btn primary" onClick={startWizard}>Connect Server</button>}
      />
    );
  }

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">Live operations</div>
          <h1>Overview</h1>
          <p>Is the server healthy, and is NightWatch seeing anything suspicious?</p>
        </div>
      </div>
      {runtime?.detail && runtime.state !== "connected" ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <strong>{runtime.state.replace("-", " ")}</strong>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{runtime.detail}</p>
        </div>
      ) : null}
      <div className="grid-4 metric-grid">
        <div className="card metric-card"><div className="metric">Players<b>{status ? `${status.playerCount ?? 0} / ${status.maxPlayers ?? 0}` : "—"}</b><span>Online capacity</span></div></div>
        <div className="card metric-card"><div className="metric">TPS<b className={(status?.tps ?? 20) < 18 ? "danger-text" : "ok-text"}>{typeof status?.tps === "number" ? status.tps.toFixed(1) : "—"}</b><span>Server tick health</span></div></div>
        <div className="card metric-card"><div className="metric">MSPT<b>{typeof status?.mspt === "number" ? `${status.mspt.toFixed(1)} ms` : "—"}</b><span>Processing latency</span></div></div>
        <div className="card metric-card"><div className="metric">Memory<b>{status ? `${formatBytes(status.memoryUsedBytes ?? 0)} / ${formatBytes(status.memoryMaxBytes ?? 0)}` : "—"}</b><span>JVM allocation</span></div></div>
      </div>
      <div className="grid-4" style={{ marginTop: 10 }}>
        <div className="card"><div className="metric">Alerts / 1H<b>{formatNumber(hour.length, 0)}</b></div></div>
        <div className="card"><div className="metric">Alerts / 24H<b>{formatNumber(day.length, 0)}</b></div></div>
        <div className="card"><div className="metric">Flagged players<b>{flagged.size}</b></div></div>
        <div className="card"><div className="metric">Critical<b className={critical ? "danger-text" : ""}>{critical}</b></div></div>
      </div>
      <div className="grid-2" style={{ marginTop: 10 }}>
        <div className="card">
          <h2>Detection activity</h2>
          {hour.length === 0 ? (
            <Empty title="No alerts yet" body="Night Panel is connected and monitoring. New detections will appear here automatically." />
          ) : (
            <div className="chart-lg"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityData}><defs><linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35}/><stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="index" hide/><YAxis allowDecimals={false} width={28}/><Tooltip contentStyle={{ background: "var(--bg-nav)", border: "1px solid var(--line)" }}/><Area type="monotone" dataKey="alerts" stroke="var(--accent)" fill="url(#alertFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
          )}
        </div>
        <div className="card">
          <h2>Anti-Cheat</h2>
          <p>Most triggered: <strong>{topCheck ?? "—"}</strong></p>
          <p>Active checks: <strong>{enabled}</strong> · Disabled: <strong>{disabled}</strong></p>
          <p>Highest investigation score: <strong>{highestScore(alerts)}</strong></p>
          <p className="muted">NightWatch {runtime?.info?.antiCheatVersion ?? "—"} · {runtime?.info?.serverSoftware} {runtime?.info?.minecraftVersion}</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <h2>Server health trend</h2>
        {healthData.length < 2 ? <p className="muted">Health trend appears after two performance samples.</p> : <div className="chart-lg"><ResponsiveContainer width="100%" height="100%"><LineChart data={healthData}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="time" minTickGap={32}/><YAxis yAxisId="tps" domain={[0, 20]}/><YAxis yAxisId="mspt" orientation="right"/><Tooltip contentStyle={{ background: "var(--bg-nav)", border: "1px solid var(--line)" }}/><Line yAxisId="tps" type="monotone" dataKey="tps" stroke="var(--ok)" dot={false} strokeWidth={2}/><Line yAxisId="mspt" type="monotone" dataKey="mspt" stroke="var(--warn)" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>}
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <h2>Recent alerts</h2>
        {alerts.slice(0, 8).map((alert) => (
          <div
            key={alert.id}
            className="row"
            style={{ justifyContent: "space-between", padding: "6px 0", cursor: "pointer" }}
            onClick={() => { selectAlert(alert.id); setView("alerts"); }}
            onKeyDown={() => undefined}
          >
            <Badge severity={alert.severity} />
            <strong>{alert.playerName}</strong>
            <span>{alert.checkName}</span>
            <span className="muted">VL {(alert.vl ?? 0).toFixed(1)}</span>
            <span className="muted">{formatAgo(alert.timestamp)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [key, count] of counts) {
    if (count > n) {
      best = key;
      n = count;
    }
  }
  return best;
}

function bucket(alerts: { timestamp: number }[], count: number, windowMs: number): number[] {
  const now = Date.now();
  const size = windowMs / count;
  const out = Array.from({ length: count }, () => 0);
  for (const alert of alerts) {
    const idx = Math.min(count - 1, Math.max(0, count - 1 - Math.floor((now - alert.timestamp) / size)));
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}

function highestScore(alerts: Parameters<typeof investigationScore>[0]): number {
  const byPlayer = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const key = alert.playerUuid || alert.playerName;
    const list = byPlayer.get(key) ?? [];
    list.push(alert);
    byPlayer.set(key, list);
  }
  return Math.max(0, ...[...byPlayer.values()].map((list) => investigationScore(list)));
}
