import { useMemo, useState } from "react";
import { Bars, Empty, Sparkline } from "../ui/bits";
import { useApp } from "../state/store";
import { SEVERITY_RANK } from "../lib/format";
import type { Severity } from "../protocol/types";

type Range = "1H" | "6H" | "24H" | "7D" | "30D";

const RANGE_MS: Record<Range, number> = {
  "1H": 3600000,
  "6H": 21600000,
  "24H": 86400000,
  "7D": 604800000,
  "30D": 2592000000,
};

export function AnalyticsPage() {
  const alerts = useApp((s) => s.alerts);
  const [range, setRange] = useState<Range>("24H");
  const windowed = useMemo(
    () => alerts.filter((a) => Date.now() - a.timestamp < RANGE_MS[range]),
    [alerts, range],
  );
  const buckets = useMemo(() => {
    const count = 24;
    const size = RANGE_MS[range] / count;
    const now = Date.now();
    const out = Array.from({ length: count }, () => 0);
    for (const alert of windowed) {
      const idx = Math.min(count - 1, Math.max(0, count - 1 - Math.floor((now - alert.timestamp) / size)));
      out[idx] = (out[idx] ?? 0) + 1;
    }
    return out;
  }, [windowed, range]);
  const checks = countBy(windowed.map((a) => a.checkName));
  const players = countBy(windowed.map((a) => a.playerName));
  const domains = countBy(windowed.map((a) => a.domain || "Other"));
  const severities = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as Severity[]).map((s) => ({
    label: s,
    value: windowed.filter((a) => a.severity === s).length,
  }));

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Analytics</h1>
          <p>Operational counts from locally stored alerts. Nothing is sent off this machine.</p>
        </div>
        <div className="row">
          {(["1H", "6H", "24H", "7D", "30D"] as Range[]).map((id) => (
            <button key={id} className={`btn ${range === id ? "primary" : ""}`} onClick={() => setRange(id)}>{id}</button>
          ))}
        </div>
      </div>
      {windowed.length === 0 ? (
        <Empty title="No detections in this range" body="Analytics fill in as NightWatch alerts arrive and are stored locally." />
      ) : (
        <>
          <div className="card">
            <h2>Alerts over time</h2>
            <Sparkline points={buckets} />
          </div>
          <div className="grid-2" style={{ marginTop: 10 }}>
            <div className="card">
              <h2>Most triggered checks</h2>
              <Bars items={checks.slice(0, 8)} />
            </div>
            <div className="card">
              <h2>Most flagged players</h2>
              <Bars items={players.slice(0, 8)} />
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: 10 }}>
            <div className="card">
              <h2>Severity</h2>
              <Bars items={severities} />
            </div>
            <div className="card">
              <h2>Categories</h2>
              <Bars items={domains} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function countBy(values: string[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || SEVERITY_RANK.INFO);
}
