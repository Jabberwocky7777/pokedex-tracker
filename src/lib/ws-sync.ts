/**
 * Managed WebSocket connection for Pokédex Tracker sync.
 *
 * Handles:
 *   - Initial connection + token auth
 *   - JSON message framing
 *   - Exponential backoff reconnect (1s → 2s → 4s → … → 30s max)
 *   - Clean teardown via close()
 */

export type WsMessage =
  | { type: "snapshot"; data: unknown; savedAt: string }
  | { type: "no-data" }
  | { type: "error"; message: string };

export interface WsSyncConnection {
  push(data: unknown): void;
  pull(): void;
  close(): void;
}

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export function connect(
  url: string,
  token: string,
  onMessage: (msg: WsMessage) => void,
  onConnected: () => void,
  onDisconnected: () => void
): WsSyncConnection {
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = MIN_BACKOFF_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function buildUrl(): string {
    const wsUrl = url.replace(/^http/, "ws");
    return `${wsUrl}?token=${encodeURIComponent(token)}`;
  }

  function openSocket() {
    if (closed) return;
    ws = new WebSocket(buildUrl());

    ws.onopen = () => {
      backoff = MIN_BACKOFF_MS;
      onConnected();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      ws = null;
      if (closed) return;
      onDisconnected();
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        openSocket();
      }, backoff);
    };

    ws.onerror = () => {
      // onclose fires after onerror — reconnect logic lives there
    };
  }

  openSocket();

  function send(msg: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  return {
    push(data) {
      send({ type: "push", data });
    },
    pull() {
      send({ type: "pull" });
    },
    close() {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
      ws = null;
    },
  };
}

// The server validates the token via the Authorization header, but the browser
// WebSocket API doesn't expose that header on the upgrade request. We pass the
// token as a query param instead — the server reads req.headers.authorization
// OR req.query.token so both paths work.
