import type { ReactNode } from "react";
import type { Severity, StoredAlert } from "../protocol/types";

export function Badge({ severity }: { severity: string }) {
  const band: Severity =
    severity === "CRITICAL" || severity === "HIGH" || severity === "MEDIUM"
      || severity === "LOW" || severity === "INFO"
      ? severity
      : "INFO";
  const mark: Record<Severity, string> = {
    INFO: "I",
    LOW: "L",
    MEDIUM: "M",
    HIGH: "H",
    CRITICAL: "C",
  };
  return (
    <span className={`badge ${band}`} title={band}>
      <span aria-hidden="true">{mark[band]}</span>
      {band}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Sparkline({ points, accent = "var(--accent)" }: { points: number[]; accent?: string }) {
  if (points.length < 2) {
    return <svg className="chart" role="img" aria-label="No activity yet" />;
  }
  const max = Math.max(...points, 1);
  const w = 600;
  const h = 88;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Detection activity">
      <path d={d} fill="none" stroke={accent} strokeWidth="1.6" />
    </svg>
  );
}

export function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      {items.map((item) => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", gap: 8, marginBottom: 6, alignItems: "center" }}>
          <span className="muted">{item.label}</span>
          <div style={{ height: 6, background: "var(--bg)", borderRadius: 99 }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
          </div>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function alertCsv(alerts: StoredAlert[]): string {
  const header = "timestamp,server,player,uuid,check,domain,vl,severity,message,ping,tps";
  const rows = alerts.map((a) =>
    [new Date(a.timestamp).toISOString(), a.serverName, a.playerName, a.playerUuid, a.checkName, a.domain, a.vl, a.severity, JSON.stringify(a.message), a.ping, a.tps].join(","),
  );
  return [header, ...rows].join("\n");
}
