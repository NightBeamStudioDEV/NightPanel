import { useEffect } from "react";
import { useApp } from "./state/store";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Shell } from "./ui/Shell";
import { Onboarding, Wizard } from "./views/Onboarding";
import { setLaunchOnStartup } from "./lib/platform";

export function App() {
  const hydrate = useApp((s) => s.hydrate);
  const ready = useApp((s) => s.ready);
  const servers = useApp((s) => s.servers);
  const wizard = useApp((s) => s.wizard);
  const settings = useApp((s) => s.settings);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.compact = settings.compact ? "1" : "0";
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? "1" : "0";
  }, [settings.theme, settings.compact, settings.reducedMotion]);

  useEffect(() => {
    void setLaunchOnStartup(settings.launchOnStartup).catch(() => undefined);
  }, [settings.launchOnStartup]);

  if (!ready) {
    return <div className="onboard muted">Loading Night Panel…</div>;
  }
  if (servers.length === 0) {
    return <Onboarding />;
  }
  return (
    <ErrorBoundary>
      <Shell />
      {wizard ? (
        <div className="drawer" style={{ width: 420 }}>
          <Wizard />
        </div>
      ) : null}
    </ErrorBoundary>
  );
}
