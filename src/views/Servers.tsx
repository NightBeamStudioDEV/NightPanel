import { useState } from "react";
import { Empty } from "../ui/bits";
import { useApp } from "../state/store";

export function ServersPage() {
  const servers = useApp((s) => s.servers);
  const runtimes = useApp((s) => s.runtimes);
  const activeId = useApp((s) => s.activeServerId);
  const setActive = useApp((s) => s.setActiveServer);
  const reconnect = useApp((s) => s.reconnectServer);
  const disconnect = useApp((s) => s.disconnectServer);
  const startWizard = useApp((s) => s.startWizard);
  const updateServer = useApp((s) => s.updateServer);
  const migratePort = useApp((s) => s.requestPortMigration);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [port, setPort] = useState("8765");
  const [error, setError] = useState("");

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">Connection fleet</div>
          <h1>Servers</h1>
          <p>Each Minecraft server is a separate WebSocket. Tokens stay in the OS keychain.</p>
        </div>
        <button className="btn primary" onClick={startWizard}>Add server</button>
      </div>
      {servers.length === 0 ? (
        <Empty title="No servers" body="Connect NightWatch Pro to start monitoring." action={<button className="btn primary" onClick={startWizard}>Connect Server</button>} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Server</th><th>URL</th><th>Status</th><th>Players</th><th></th></tr>
            </thead>
            <tbody>
              {servers.map((server) => {
                const rt = runtimes[server.id];
                return (
                  <tr key={server.id} className={server.id === activeId ? "active" : ""} onClick={() => setActive(server.id)}>
                    <td>
                      <span className={`dot ${rt?.state === "connected" ? "ok" : "crit"}`} /> {server.name}
                    </td>
                    <td className="muted">{server.url}</td>
                    <td>{rt?.state ?? "offline"}</td>
                    <td>{rt?.status?.playerCount ?? "—"}</td>
                    <td>
                      <button className="btn" onClick={(e) => { e.stopPropagation(); void reconnect(server.id); }}>Reconnect</button>
                      {" "}
                      <button className="btn" onClick={(e) => { e.stopPropagation(); setEditing(server.id); setName(server.name); setUrl(server.url); try { setPort(String(new URL(server.url).port || (server.url.startsWith("wss:") ? 443 : 80))); } catch { setPort("8765"); } setError(""); }}>Edit</button>
                      {" "}
                      <button className="btn danger" onClick={(e) => { e.stopPropagation(); void disconnect(server.id); }}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <div className="drawer">
        <div className="eyebrow">Server profile</div><h2>Edit connection</h2>
        <div className="field"><label>Name</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="field"><label>WebSocket URL</label><input value={url} onChange={(event) => setUrl(event.target.value)} /></div>
        <button className="btn primary" onClick={() => void updateServer(editing, { name: name.trim() || "Minecraft Server", url: url.trim() }).then(() => setEditing(null)).catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not update server"))}>Save and reconnect</button>
        <div className="divider" />
        <h2>Guarded port migration</h2>
        <p className="muted">Administrators can start a second listener, verify it, then retire the old port. Failed migrations leave the current listener active.</p>
        <div className="field"><label>New port</label><input type="number" min={1024} max={65535} value={port} onChange={(event) => setPort(event.target.value)} /></div>
        <button className="btn" disabled={runtimes[editing]?.authorization?.role !== "ADMIN"} onClick={() => void migratePort(editing, Number(port)).then(() => setEditing(null)).catch((value: unknown) => setError(value instanceof Error ? value.message : "Migration failed"))}>Migrate WebSocket port</button>
        {error ? <p className="danger-text">{error}</p> : null}
        <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={() => setEditing(null)}>Cancel</button></div>
      </div> : null}
    </>
  );
}
