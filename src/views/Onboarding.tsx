import { useState } from "react";
import { useApp } from "../state/store";

export function Onboarding() {
  const startWizard = useApp((s) => s.startWizard);
  const wizard = useApp((s) => s.wizard);
  if (wizard) {
    return <Wizard />;
  }
  return (
    <div className="onboard">
      <img src="/icon.png" width={72} height={72} alt="" style={{ borderRadius: 16 }} />
      <h1>Night Panel</h1>
      <p className="muted">Real-time Anti-Cheat intelligence for your Minecraft servers.</p>
      <button className="btn primary" style={{ marginTop: 20 }} onClick={startWizard}>Connect Server</button>
    </div>
  );
}

export function Wizard() {
  const wizard = useApp((s) => s.wizard);
  const cancel = useApp((s) => s.cancelWizard);
  const connectNew = useApp((s) => s.connectNew);
  const [name, setName] = useState(wizard?.name ?? "");
  const [url, setUrl] = useState(wizard?.url ?? "ws://127.0.0.1:8765");
  const [token, setToken] = useState(wizard?.token ?? "");
  const [pairCode, setPairCode] = useState(wizard?.pairCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!wizard) {
    return null;
  }

  return (
    <div className="wizard card">
      <h1 style={{ marginTop: 0 }}>Connect your first Minecraft server</h1>
      <p className="muted">Use the token in plugins/NightWatchPro/panel-token, or a pairing code from /nw panel pair.</p>
      <div className="field">
        <label>Server name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Survival" />
      </div>
      <div className="field">
        <label>WebSocket URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://127.0.0.1:8765" />
      </div>
      <div className="field">
        <label>Authentication token</label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label>Pairing code (optional)</label>
        <input value={pairCode} onChange={(e) => setPairCode(e.target.value)} placeholder="928 417" />
      </div>
      {error ? <p className="danger-text">{error}</p> : null}
      <div className="row">
        <button
          className="btn primary"
          disabled={busy || (!token && !pairCode)}
          onClick={() => {
            setBusy(true);
            setError("");
            void connectNew({ name, url, token, pairCode }).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not connect");
              setBusy(false);
            });
          }}
        >
          {busy ? "Connecting…" : "Connect Server"}
        </button>
        <button className="btn" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}
