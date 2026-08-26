use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, State, WindowEvent,
};

struct AppDb(Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredAlert {
    id: String,
    server_id: String,
    server_name: String,
    timestamp: i64,
    player_name: String,
    player_uuid: String,
    check_id: String,
    check_name: String,
    domain: String,
    vl: f64,
    max_vl: f64,
    severity: String,
    message: String,
    ping: i64,
    tps: f64,
    evidence: f64,
    threshold: f64,
    debug: serde_json::Value,
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn open_db(path: &PathBuf) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
         INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
         CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            server_id TEXT NOT NULL,
            server_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            player_name TEXT NOT NULL,
            player_uuid TEXT NOT NULL,
            check_id TEXT NOT NULL,
            check_name TEXT NOT NULL,
            domain TEXT NOT NULL,
            vl REAL NOT NULL,
            max_vl REAL NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            ping INTEGER NOT NULL,
            tps REAL NOT NULL,
            evidence REAL NOT NULL,
            threshold REAL NOT NULL,
            debug TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS alerts_time ON alerts(timestamp DESC);",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
fn secret_set(id: String, value: String) -> Result<(), String> {
    let entry =
        keyring::Entry::new("studio.nightbeam.nightpanel", &id).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn secret_get(id: String) -> Result<Option<String>, String> {
    let entry =
        keyring::Entry::new("studio.nightbeam.nightpanel", &id).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
fn secret_delete(id: String) -> Result<(), String> {
    let entry =
        keyring::Entry::new("studio.nightbeam.nightpanel", &id).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
fn db_insert_alert(db: State<AppDb>, alert: StoredAlert) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let debug = serde_json::to_string(&alert.debug).unwrap_or_else(|_| "{}".into());
    conn.execute(
        "INSERT OR REPLACE INTO alerts
         (id, server_id, server_name, timestamp, player_name, player_uuid, check_id, check_name, domain, vl, max_vl, severity, message, ping, tps, evidence, threshold, debug)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![
            alert.id,
            alert.server_id,
            alert.server_name,
            alert.timestamp,
            alert.player_name,
            alert.player_uuid,
            alert.check_id,
            alert.check_name,
            alert.domain,
            alert.vl,
            alert.max_vl,
            alert.severity,
            alert.message,
            alert.ping,
            alert.tps,
            alert.evidence,
            alert.threshold,
            debug
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_list_alerts(db: State<AppDb>) -> Result<Vec<StoredAlert>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, server_id, server_name, timestamp, player_name, player_uuid, check_id, check_name, domain, vl, max_vl, severity, message, ping, tps, evidence, threshold, debug
             FROM alerts ORDER BY timestamp DESC LIMIT 8000",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let debug: String = row.get(17)?;
            Ok(StoredAlert {
                id: row.get(0)?,
                server_id: row.get(1)?,
                server_name: row.get(2)?,
                timestamp: row.get(3)?,
                player_name: row.get(4)?,
                player_uuid: row.get(5)?,
                check_id: row.get(6)?,
                check_name: row.get(7)?,
                domain: row.get(8)?,
                vl: row.get(9)?,
                max_vl: row.get(10)?,
                severity: row.get(11)?,
                message: row.get(12)?,
                ping: row.get(13)?,
                tps: row.get(14)?,
                evidence: row.get(15)?,
                threshold: row.get(16)?,
                debug: serde_json::from_str(&debug).unwrap_or(serde_json::json!({})),
            })
        })
        .map_err(|e| e.to_string())?;
    let mut alerts = Vec::new();
    for row in rows {
        alerts.push(row.map_err(|e| e.to_string())?);
    }
    Ok(alerts)
}

#[tauri::command]
fn db_clear_alerts(db: State<AppDb>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM alerts", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let dir = data_dir(app.handle())?;
            let db_path = dir.join("night-panel.sqlite3");
            let conn = open_db(&db_path)?;
            app.manage(AppDb(Mutex::new(conn)));

            let show = MenuItem::with_id(app, "show", "Open Night Panel", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            secret_set,
            secret_get,
            secret_delete,
            db_insert_alert,
            db_list_alerts,
            db_clear_alerts
        ])
        .run(tauri::generate_context!())
        .expect("error while running Night Panel");
}
