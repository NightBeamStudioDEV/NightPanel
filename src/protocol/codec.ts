import { PROTOCOL, type Envelope } from "./types";

export function encode(
  type: string,
  data: Record<string, unknown>,
  serverId: string,
  requestId?: string,
): string {
  const envelope: Envelope = {
    protocol: PROTOCOL,
    type,
    timestamp: Date.now(),
    serverId,
    data,
  };
  if (requestId) {
    envelope.requestId = requestId;
  }
  return JSON.stringify(envelope);
}

export function decode(raw: string): Envelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ProtocolError("error.protocol", "malformed json");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ProtocolError("error.protocol", "frame is not an object");
  }
  const root = parsed as Record<string, unknown>;
  if (typeof root.protocol !== "number") {
    throw new ProtocolError("error.protocol", "missing protocol");
  }
  if (root.protocol !== PROTOCOL) {
    throw new ProtocolError("error.protocol_mismatch", "unsupported protocol", {
      serverProtocol: root.protocol,
      clientProtocol: PROTOCOL,
    });
  }
  if (typeof root.type !== "string" || root.type.length === 0) {
    throw new ProtocolError("error.protocol", "missing type");
  }
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : {};
  return {
    protocol: root.protocol,
    type: root.type,
    timestamp: typeof root.timestamp === "number" ? root.timestamp : Date.now(),
    serverId: typeof root.serverId === "string" ? root.serverId : "",
    requestId: typeof root.requestId === "string" ? root.requestId : undefined,
    data,
  };
}

export class ProtocolError extends Error {
  readonly errorType: string;
  readonly extra: Record<string, unknown>;

  constructor(errorType: string, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.errorType = errorType;
    this.extra = extra;
  }
}
