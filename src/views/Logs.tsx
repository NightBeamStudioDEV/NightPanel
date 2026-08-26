import { useState } from "react";
import { Empty } from "../ui/bits";
import { useApp } from "../state/store";
import { formatExact } from "../lib/format";

export function LogsPage() {
  const logs = useApp((s) => s.logs);
  const [level, setLevel] = useState<"all" | "info" | "warn" | "error">("all");
  const visible = logs.filter((l) => level === "all" || l.level === level);
  const text = visible.map((l) => `${formatExact(l.timestamp)} ${l.level.toUpperCase()} ${l.message}`).join("\n");

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Logs</h1>
          <p>Night Panel diagnostics. Tokens are never written here.</p>
        </div>
        <div className="row">
          <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
            <option value="all">All</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
          <button className="btn" onClick={() => void navigator.clipboard.writeText(text)}>Copy diagnostics</button>
          <button className="btn" onClick={() => {
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "night-panel-logs.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}>Export</button>
        </div>
      </div>
      {visible.length === 0 ? (
        <Empty title="No log lines" body="Connection attempts, protocol errors, and reconnects will show up here." />
      ) : (
        <pre className="debug">{text}</pre>
      )}
    </>
  );
}
