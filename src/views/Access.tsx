import { useState } from "react";
import { useApp } from "../state/store";
import { useActiveRuntime } from "../state/hooks";
import type { OperatorRole } from "../protocol/types";
import { Empty } from "../ui/bits";

export function AccessPage() {
  const activeId = useApp((state) => state.activeServerId);
  const runtime = useActiveRuntime();
  const refresh = useApp((state) => state.refreshCredentials);
  const createPairingCode = useApp((state) => state.createPairingCode);
  const revoke = useApp((state) => state.revokeCredential);
  const [role, setRole] = useState<OperatorRole>("VIEWER");
  const [label, setLabel] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [error, setError] = useState("");
  const canManage = runtime?.authorization?.permissions.includes("credentials.manage")
    || runtime?.authorization?.role === "ADMIN";

  if (!canManage) {
    return <Empty title="Administrator credential required" body="Access management is visible only to administrators." />;
  }

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">Least privilege</div>
          <h1>Access</h1>
          <p>Issue role-scoped pairing codes and revoke operator credentials.</p>
        </div>
        <button className="btn" onClick={() => activeId && void refresh(activeId)}>Refresh</button>
      </div>
      <div className="grid-2 access-grid">
        <section className="card">
          <h2>Create pairing code</h2>
          <div className="field"><label>Credential label</label><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="On-call moderator" /></div>
          <div className="field"><label>Role</label><select value={role} onChange={(event) => setRole(event.target.value as OperatorRole)}><option>VIEWER</option><option>MODERATOR</option><option>ADMIN</option></select></div>
          <button className="btn primary" disabled={!activeId || !label.trim()} onClick={() => {
            if (!activeId) return;
            setError("");
            void createPairingCode(activeId, role, label.trim()).then(setPairCode).catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not create pairing code"));
          }}>Create one-time code</button>
          {pairCode ? <div className="pair-code"><span>Expires in five minutes</span><strong>{pairCode}</strong></div> : null}
          {error ? <p className="danger-text">{error}</p> : null}
        </section>
        <section className="card table-card">
          <h2>Credentials</h2>
          {(runtime?.credentials.length ?? 0) === 0 ? <p className="muted">No credential metadata returned by this server.</p> : (
            <table className="table"><thead><tr><th>Label</th><th>Role</th><th></th></tr></thead><tbody>
              {runtime?.credentials.map((credential) => (
                <tr key={credential.id}><td>{credential.label}<div className="muted">{credential.id}</div></td><td>{credential.role}</td><td><button className="btn danger" disabled={credential.id === runtime.authorization?.credentialId} onClick={() => activeId && void revoke(activeId, credential.id)}>Revoke</button></td></tr>
              ))}
            </tbody></table>
          )}
        </section>
      </div>
    </>
  );
}

