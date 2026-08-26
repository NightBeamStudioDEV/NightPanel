import type { StoredAlert } from "../protocol/types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function secretSet(id: string, value: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("secret_set", { id, value });
    return;
  }
  localStorage.setItem(`night-panel.secret.${id}`, value);
}

export async function secretGet(id: string): Promise<string | null> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const value = await invoke<string | null>("secret_get", { id });
    return value;
  }
  return localStorage.getItem(`night-panel.secret.${id}`);
}

export async function secretDelete(id: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("secret_delete", { id });
    return;
  }
  localStorage.removeItem(`night-panel.secret.${id}`);
}

export async function persistAlert(alert: StoredAlert): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("db_insert_alert", { alert });
    return;
  }
  const key = "night-panel.alerts";
  const current = JSON.parse(localStorage.getItem(key) ?? "[]") as StoredAlert[];
  current.unshift(alert);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 5000)));
}

export async function loadPersistedAlerts(): Promise<StoredAlert[]> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<StoredAlert[]>("db_list_alerts");
  }
  return JSON.parse(localStorage.getItem("night-panel.alerts") ?? "[]") as StoredAlert[];
}

export async function clearPersistedAlerts(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("db_clear_alerts");
    return;
  }
  localStorage.removeItem("night-panel.alerts");
}

export async function nativeNotify(title: string, body: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({ title, body });
    }
  } catch {
    // Notifications are best-effort.
  }
}

export async function setLaunchOnStartup(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const { disable, enable, isEnabled } = await import("@tauri-apps/plugin-autostart");
  const current = await isEnabled();
  if (enabled && !current) await enable();
  if (!enabled && current) await disable();
}

export function newId(): string {
  return crypto.randomUUID();
}
