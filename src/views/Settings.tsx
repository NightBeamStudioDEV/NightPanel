import { useApp } from "../state/store";
import type { Severity } from "../protocol/types";

export function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const clearAlerts = useApp((s) => s.clearAlerts);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Settings</h1>
          <p>Everything stays on this machine. Night Panel has no cloud account.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>General</h2>
          <label className="row"><input type="checkbox" checked={settings.launchOnStartup} onChange={(e) => update({ launchOnStartup: e.target.checked })} /> Launch on startup</label>
          <label className="row"><input type="checkbox" checked={settings.minimizeToTray} onChange={(e) => update({ minimizeToTray: e.target.checked })} /> Minimize to tray</label>
          <label className="row"><input type="checkbox" checked={settings.closeToTray} onChange={(e) => update({ closeToTray: e.target.checked })} /> Close to tray</label>
        </section>
        <section className="card">
          <h2>Appearance</h2>
          <div className="field">
            <label>Theme</label>
            <select value={settings.theme} onChange={(e) => update({ theme: e.target.value as "dark" | "light" | "system" })}>
              <option value="dark">Dark</option>
              <option value="system">System</option>
              <option value="light">Light</option>
            </select>
          </div>
          <label className="row"><input type="checkbox" checked={settings.compact} onChange={(e) => update({ compact: e.target.checked })} /> Compact mode</label>
          <label className="row"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} /> Reduced motion</label>
        </section>
        <section className="card">
          <h2>Notifications</h2>
          <label className="row"><input type="checkbox" checked={settings.notifyEnabled} onChange={(e) => update({ notifyEnabled: e.target.checked })} /> Enabled</label>
          <label className="row"><input type="checkbox" checked={settings.pauseNotifications} onChange={(e) => update({ pauseNotifications: e.target.checked })} /> Pause notifications</label>
          <div className="field">
            <label>Minimum severity</label>
            <select value={settings.notifyMinSeverity} onChange={(e) => update({ notifyMinSeverity: e.target.value as Severity })}>
              {(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Cooldown (ms)</label>
            <input type="number" value={settings.notifyCooldownMs} onChange={(e) => update({ notifyCooldownMs: Number(e.target.value) })} />
          </div>
          <label className="row"><input type="checkbox" checked={settings.notifyGroupRepeats} onChange={(e) => update({ notifyGroupRepeats: e.target.checked })} /> Group repeated alerts</label>
        </section>
        <section className="card">
          <h2>Data</h2>
          <div className="field">
            <label>History retention (days, empty = forever)</label>
            <input
              type="number"
              value={settings.retentionDays ?? ""}
              onChange={(e) => update({ retentionDays: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <button className="btn danger" onClick={() => void clearAlerts()}>Clear local database</button>
        </section>
        <section className="card">
          <h2>Security</h2>
          <p>Authentication tokens are stored in the OS keychain when running under Tauri, never in the alert database.</p>
          <p className="muted">A Night Panel token is equivalent to nightwatch.admin on that socket.</p>
        </section>
        <section className="card">
          <h2>Advanced</h2>
          <label className="row"><input type="checkbox" checked={settings.debug} onChange={(e) => update({ debug: e.target.checked })} /> Developer mode</label>
          <p className="muted">Developer mode shows raw payloads in the alert drawer.</p>
        </section>
        <section className="card">
          <h2>About</h2>
          <p>Night Panel 1.0.0 · Protocol 1</p>
          <p className="muted">Apache License 2.0. Companion desktop app for NightWatch Pro. No telemetry.</p>
        </section>
      </div>
    </>
  );
}
