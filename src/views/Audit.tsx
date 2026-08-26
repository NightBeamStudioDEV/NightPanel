import { useMemo, useState } from "react";
import { formatExact } from "../lib/format";
import { useApp } from "../state/store";
import { useActiveRuntime } from "../state/hooks";
import { Empty } from "../ui/bits";

export function AuditPage() {
  const activeId = useApp((state) => state.activeServerId);
  const refresh = useApp((state) => state.refreshAudit);
  const runtime = useActiveRuntime();
  const [query, setQuery] = useState("");
  const canRead = runtime?.authorization?.permissions.includes("audit.read")
    || runtime?.authorization?.role === "ADMIN";
  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return runtime?.audit ?? [];
    return (runtime?.audit ?? []).filter((entry) =>
      `${entry.action} ${entry.targetName ?? ""} ${entry.credentialLabel} ${entry.outcome} ${entry.reason ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, runtime?.audit]);

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">Accountability</div>
          <h1>Audit trail</h1>
          <p>Server-authoritative records for remote moderation and configuration changes.</p>
        </div>
        <div className="row">
          <input className="search-input compact-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter actions, operators, or players" />
          <button className="btn" disabled={!activeId || !canRead} onClick={() => activeId && void refresh(activeId)}>Refresh</button>
        </div>
      </div>
      {!canRead ? (
        <Empty title="Audit permission required" body="Connect with a viewer, moderator, or administrator credential that includes audit.read." />
      ) : entries.length === 0 ? (
        <Empty title="No remote actions recorded" body="Completed and denied operations will appear here without exposing credentials." />
      ) : (
        <section className="card table-card">
          <table className="table">
            <thead><tr><th>Time</th><th>Operator</th><th>Action</th><th>Target</th><th>Reason</th><th>Outcome</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="muted">{formatExact(entry.timestamp)}</td>
                  <td>{entry.credentialLabel}<div className="muted">{entry.role}</div></td>
                  <td>{entry.action.replaceAll("_", " ")}</td>
                  <td>{entry.targetName ?? "Server"}</td>
                  <td className="muted">{entry.reason || "—"}</td>
                  <td><span className={`outcome ${entry.outcome.toLowerCase()}`}>{entry.outcome}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

