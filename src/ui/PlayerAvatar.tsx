import { useState } from "react";

export function PlayerAvatar({
  name,
  uuid,
  size = 32,
}: {
  name: string;
  uuid?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const key = uuid && isUuid(uuid) ? uuid : name;
  const src = `https://mc-heads.net/avatar/${encodeURIComponent(key)}/${size}`;
  const initial = (name || "?").slice(0, 1).toUpperCase();

  if (failed || !name) {
    return (
      <span className="avatar fallback" style={{ width: size, height: size, fontSize: size * 0.42 }} title={name}>
        {initial}
      </span>
    );
  }

  return (
    <img
      className="avatar"
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
