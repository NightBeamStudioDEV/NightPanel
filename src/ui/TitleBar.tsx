import { useEffect, useState, type ReactNode } from "react";
import { isTauri } from "../lib/platform";
import { useApp } from "../state/store";
import { IconClose, IconMaximize, IconMinimize, IconRestore } from "./icons";

export function TitleBar() {
  const servers = useApp((s) => s.servers);
  const activeId = useApp((s) => s.activeServerId);
  const runtimes = useApp((s) => s.runtimes);
  const active = servers.find((s) => s.id === activeId);
  const runtime = activeId ? runtimes[activeId] : undefined;
  const connected = runtime?.state === "connected";
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      setMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => {
        setMaximized(await win.isMaximized());
      });
    })();
    return () => unlisten?.();
  }, []);

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <img src="/icon.png" alt="" width={18} height={18} />
        <span>Night Panel</span>
      </div>
      {active ? (
        <div className="titlebar-status" data-tauri-drag-region>
          <span className={`dot ${connected ? "ok" : runtime?.state === "reconnecting" || runtime?.state === "connecting" ? "spin" : "crit"}`} />
          <strong>{active.name}</strong>
          <span className="muted">{statusLabel(runtime?.state, runtime?.rttMs)}</span>
        </div>
      ) : (
        <div className="titlebar-status muted" data-tauri-drag-region>Connect a server</div>
      )}
      <div className="titlebar-controls">
        <WindowButton label="Minimize" onClick={() => void windowAction("minimize")}>
          <IconMinimize />
        </WindowButton>
        <WindowButton label={maximized ? "Restore" : "Maximize"} onClick={() => void windowAction("toggleMaximize")}>
          {maximized ? <IconRestore /> : <IconMaximize />}
        </WindowButton>
        <WindowButton label="Close" danger onClick={() => void windowAction("close")}>
          <IconClose />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`win-btn${danger ? " danger" : ""}`} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

async function windowAction(action: "minimize" | "toggleMaximize" | "close"): Promise<void> {
  if (!isTauri()) {
    if (action === "close") window.close();
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  if (action === "minimize") await win.minimize();
  if (action === "toggleMaximize") await win.toggleMaximize();
  if (action === "close") await win.close();
}

function statusLabel(state: string | undefined, rtt?: number): string {
  switch (state) {
    case "connected":
      return typeof rtt === "number" && rtt > 0 ? `Connected · ${Math.round(rtt)}ms` : "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "auth-failed":
      return "Authentication failed";
    case "protocol-mismatch":
      return "Protocol mismatch";
    default:
      return "Offline";
  }
}
