import type { StoredAlert } from "./types";

/**
 * Investigation priority score, 0–100. Not a cheat probability.
 *
 * Weighted from alert frequency, distinct checks, VL magnitude, severity, and
 * how tightly the alerts cluster in time. Documented in docs/night-panel.md.
 */
export function investigationScore(alerts: StoredAlert[], now = Date.now()): number {
  if (alerts.length === 0) {
    return 0;
  }
  const hour = alerts.filter((a) => now - a.timestamp < 60 * 60 * 1000);
  const distinct = new Set(alerts.map((a) => a.checkId)).size;
  const maxVlRatio = Math.max(
    0,
    ...alerts.map((a) => (a.maxVl <= 0 ? 0 : a.vl / a.maxVl)),
  );
  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
  const high = alerts.filter((a) => a.severity === "HIGH").length;

  let cluster = 0;
  if (hour.length >= 4) {
    const span = Math.max(1, Math.max(...hour.map((a) => a.timestamp)) - Math.min(...hour.map((a) => a.timestamp)));
    cluster = Math.min(20, (hour.length / (span / 60000)) * 4);
  }

  const score =
    Math.min(25, hour.length * 3)
    + Math.min(20, distinct * 5)
    + Math.min(25, maxVlRatio * 25)
    + Math.min(15, critical * 5 + high * 2)
    + cluster;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBand(score: number): string {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 41) return "Suspicious";
  if (score >= 21) return "Watch";
  return "Normal";
}
