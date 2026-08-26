import { useState } from "react";
import { Empty } from "../ui/bits";
import { useApp } from "../state/store";
import { useActiveAlerts, useActiveRuntime } from "../state/hooks";

export function ChecksPage() {
  const activeId = useApp((s) => s.activeServerId);
  const runtime = useActiveRuntime();
  const alerts = useActiveAlerts();
  const requestToggle = useApp((s) => s.requestToggleCheck);
  const requestReload = useApp((s) => s.requestReload);
  const [pending, setPending] = useState<string | null>(null);
  const remote = runtime?.info?.remoteActionsEnabled === true;
  const checks = runtime?.checks ?? [];
  const domains = [...new Set(checks.map((c) => c.domain))];

  if (checks.length === 0) {
    return <Empty title="No check catalog yet" body="Connect to NightWatch Pro to load the registered checks." />;
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Checks</h1>
          <p>NightWatch domains. Remote enable/disable requires remote-actions on the server.</p>
        </div>
        {remote && activeId ? (
          <button className="btn" onClick={() => void requestReload(activeId)}>Reload anticheat</button>
        ) : null}
      </div>
      {domains.map((domain) => (
        <div key={domain} className="card" style={{ marginBottom: 10 }}>
          <h2>{domain}</h2>
          <table className="table">
            <thead>
              <tr><th>Check</th><th>Status</th><th>Alerts today</th><th>Players</th><th>Avg VL</th><th></th></tr>
            </thead>
            <tbody>
              {checks.filter((c) => c.domain === domain).map((check) => {
                const related = alerts.filter((a) => a.checkId === check.id);
                const players = new Set(related.map((a) => a.playerUuid || a.playerName)).size;
                const avg = related.length === 0 ? 0 : related.reduce((s, a) => s + a.vl, 0) / related.length;
                return (
                  <tr key={check.id}>
                    <td>
                      <strong>{check.name}</strong>
                      <div className="muted">{check.id} · {check.counters}</div>
                    </td>
                    <td>{check.enabled ? (check.alertOnly ? "Alert-only" : "Enabled") : "Disabled"}</td>
                    <td>{related.length}</td>
                    <td>{players}</td>
                    <td>{avg.toFixed(1)}</td>
                    <td>
                      {remote && activeId ? (
                        <button
                          className="btn"
                          onClick={() => setPending(check.id)}
                        >
                          {check.enabled ? "Disable" : "Enable"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      {pending && activeId ? (
        <div className="drawer">
          <h2>Confirm remote change</h2>
          <p>This will {checks.find((c) => c.id === pending)?.enabled ? "disable" : "enable"} <strong>{pending}</strong> on the Minecraft server.</p>
          <div className="row">
            <button className="btn danger" onClick={() => {
              const check = checks.find((c) => c.id === pending);
              if (check) void requestToggle(activeId, pending, !check.enabled);
              setPending(null);
            }}>Confirm</button>
            <button className="btn" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
