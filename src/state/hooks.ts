import { useMemo } from "react";
import { useApp } from "./store";
import type { StoredAlert } from "../protocol/types";

/** Select the raw alert list, then filter. Never `.filter` inside a Zustand selector. */
export function useActiveAlerts(): StoredAlert[] {
  const activeId = useApp((s) => s.activeServerId);
  const alerts = useApp((s) => s.alerts);
  return useMemo(
    () => (activeId ? alerts.filter((a) => a.serverId === activeId) : alerts),
    [alerts, activeId],
  );
}

export function useActiveRuntime() {
  const activeId = useApp((s) => s.activeServerId);
  const runtimes = useApp((s) => s.runtimes);
  return activeId ? runtimes[activeId] : undefined;
}
