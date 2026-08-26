import { useState } from "react";
import { useApp } from "../state/store";
import { IconLock, IconUser } from "../ui/icons";

export function Onboarding() {
  return <Wizard />;
}

export function Wizard() {
  const wizard = useApp((s) => s.wizard);
  const cancel = useApp((s) => s.cancelWizard);
  const connectNew = useApp((s) => s.connectNew);
  const startWizard = useApp((s) => s.startWizard);
  const servers = useApp((s) => s.servers);
  const [mode, setMode] = useState<"token" | "pair">("token");
  const [name, setName] = useState(wizard?.name ?? "");
  const [url, setUrl] = useState(wizard?.url ?? "ws://127.0.0.1:8765");
  const [token, setToken] = useState(wizard?.token ?? "");
  const [pairCode, setPairCode] = useState(wizard?.pairCode ?? "");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = mode === "pair" ? pairCode.replace(/\s+/g, "").length >= 6 : token.trim().length > 0;

  function ensureWizard() {
    if (!wizard) startWizard();
  }

  return (
    <div className="login-screen">
      <div className="login-stack">
        <h1 className="login-heading">USER LOGIN</h1>
        <form
          className="login-card"
          onSubmit={(event) => {
            event.preventDefault();
            ensureWizard();
            setBusy(true);
            setError("");
            void connectNew({
              name: name.trim() || "Minecraft Server",
              url: url.trim() || "ws://127.0.0.1:8765",
              token: mode === "token" ? token : "",
              pairCode: mode === "pair" ? pairCode : "",
            }).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not connect");
              setBusy(false);
            });
          }}
        >
          <label className="login-field">
            <span className="login-icon" aria-hidden="true"><IconUser size={16} /></span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Server name"
              autoComplete="off"
            />
          </label>
          <label className="login-field">
            <span className="login-icon" aria-hidden="true"><IconLock size={16} /></span>
            {mode === "token" ? (
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Authentication token"
                autoComplete="off"
              />
            ) : (
              <input
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                placeholder="Pairing code"
                autoComplete="off"
              />
            )}
          </label>
          <div className="login-meta">
            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <button
              type="button"
              className="login-link"
              onClick={() => {
                setMode(mode === "token" ? "pair" : "token");
                setError("");
              }}
            >
              {mode === "token" ? "Use pairing code" : "Use token"}
            </button>
          </div>
          <p className="login-url">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://127.0.0.1:8765"
              spellCheck={false}
            />
          </p>
          {error ? <p className="danger-text login-error">{error}</p> : null}
          <button className="login-submit" type="submit" disabled={busy || !canSubmit}>
            {busy ? "CONNECTING…" : "LOGIN"}
          </button>
        </form>
        <button
          type="button"
          className="login-register"
          onClick={() => {
            setMode("pair");
            ensureWizard();
          }}
        >
          REGISTER
        </button>
        {servers.length > 0 ? (
          <button type="button" className="login-cancel" onClick={cancel}>Back to dashboard</button>
        ) : (
          <p className="login-hint">Token is in plugins/NightWatchPro/panel-token, or run /nw panel pair.</p>
        )}
      </div>
    </div>
  );
}
