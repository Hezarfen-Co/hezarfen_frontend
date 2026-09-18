import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { getBoardStrokes, type Board } from "@/api/boards";
import { formatApiErrorMessage } from "@/api/client";
import { IconAlert } from "@/components/ui/icons";
import { encodeStrokeSegments, decodeSegment, segmentToStroke } from "@/lib/board-stroke-codec";
import type { Stroke } from "@/lib/draw-stroke";
import { parseBoardWsMessage, type BoardWsMessage } from "@/lib/websocket-messages";
import { usePreferences } from "@/stores/preferences-context";
import { WhiteboardCanvas, type WhiteboardCanvasController } from "./whiteboard-canvas";

type WsState = "connecting" | "connected" | "disconnected";

// Live state the room lifts back to the page so its creator controls and roster
// reflect what the socket saw (a fanned-out lock/close/roster change).
export type BoardLiveState = {
  locked?: boolean;
  closed?: boolean;
  creator?: string;
  participants?: string[];
  epoch?: number;
};

const MAX_RECONNECT = 6;

export function WhiteboardRoom(props: {
  board: Board;
  meId: string;
  onState?: (patch: BoardLiveState) => void;
  onConnectionChange?: (state: WsState) => void;
  onDeleted?: () => void;
}) {
  const { locale } = usePreferences();

  const [wsState, setWsState] = createSignal<WsState>("disconnected");
  const [locked, setLocked] = createSignal(props.board.locked);
  const [closed, setClosed] = createSignal(props.board.closed_at != null);
  const [creator, setCreator] = createSignal(props.board.creator);
  const [participants, setParticipants] = createSignal<string[]>(props.board.participants);
  const [notice, setNotice] = createSignal("");

  let controller: WhiteboardCanvasController | null = null;
  let ws: WebSocket | null = null;
  let epoch: number = props.board.epoch;
  let cursor: string | null = null;
  let clientSeq = 0;
  // Backend stroke row ids already painted, so a resync/replay never double-draws.
  const seen = new Set<string>();

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let closedByUs = false;

  const isParticipant = () => props.meId === creator() || participants().includes(props.meId);
  const canDraw = () => wsState() === "connected" && !locked() && !closed() && isParticipant();

  const wsUrl = () => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/boards/${encodeURIComponent(props.board.id)}/ws`;
  };

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closedByUs || reconnectTimer) return;
    if (closed()) return; // a closed board is read-only; the socket will only replay
    if (reconnectAttempts >= MAX_RECONNECT) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectWs();
    }, delay);
  };

  const applyRow = (row: { id: string; payload: string | null }) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    const seg = decodeSegment(row.payload);
    if (seg) controller?.applyStroke(segmentToStroke(seg));
  };

  const wipe = () => {
    seen.clear();
    controller?.reset();
  };

  // Reconcile the whole live canvas from REST — used when the server rejects a
  // draw (locked/full/closed): the database is the authority, so we throw the
  // optimistic local canvas away and take what is actually stored.
  const resyncFromRest = async () => {
    try {
      const page = await getBoardStrokes(props.board.id, { limit: 500 });
      wipe();
      for (const row of page.items) applyRow({ id: row.id, payload: row.payload });
    } catch {
      // socket replay will catch us up on the next reconnect
    }
  };

  const connectWs = () => {
    clearReconnect();
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
    }
    setWsState("connecting");
    const socket = new WebSocket(wsUrl());
    ws = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      setWsState("connected");
      // Resume from our cursor; the server replays only what is newer (or the
      // whole current epoch, preceded by a `cleared`, on a stale/absent cursor).
      sendWs({ type: "join", after: cursor ?? undefined, epoch });
    };
    const dropped = () => {
      setWsState("disconnected");
      ws = null;
      scheduleReconnect();
    };
    socket.onclose = dropped;
    socket.onerror = dropped;
    socket.onmessage = (event) => {
      try {
        const msg = parseBoardWsMessage(JSON.parse(event.data));
        if (msg) handle(msg);
      } catch {
        // ignore malformed frame
      }
    };
  };

  const sendWs = (data: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };

  const pushState = (patch: BoardLiveState) => props.onState?.(patch);

  const handle = (msg: BoardWsMessage) => {
    switch (msg.type) {
      case "state": {
        epoch = msg.epoch;
        setLocked(msg.locked);
        setClosed(msg.closed_at != null);
        setCreator(msg.creator);
        setParticipants(msg.participants);
        pushState({ locked: msg.locked, closed: msg.closed_at != null, creator: msg.creator, participants: msg.participants, epoch: msg.epoch });
        break;
      }
      case "strokes": {
        for (const row of msg.strokes) applyRow(row);
        break;
      }
      case "synced": {
        epoch = msg.epoch;
        cursor = msg.cursor;
        break;
      }
      case "stroke": {
        applyRow(msg);
        break;
      }
      case "saved": {
        break; // our own mark persisted; already painted optimistically
      }
      case "cleared": {
        epoch = msg.epoch;
        wipe();
        pushState({ epoch: msg.epoch });
        break;
      }
      case "locked": {
        setLocked(msg.locked);
        pushState({ locked: msg.locked });
        break;
      }
      case "closed": {
        setClosed(true);
        pushState({ closed: true });
        break;
      }
      case "participants": {
        setCreator(msg.creator);
        setParticipants(msg.participants);
        pushState({ creator: msg.creator, participants: msg.participants });
        break;
      }
      case "deleted": {
        closedByUs = true;
        props.onDeleted?.();
        break;
      }
      case "pong": {
        break;
      }
      case "error": {
        const message = formatApiErrorMessage(msg.message, locale());
        setNotice(message);
        // A rejected draw (locked, full epoch, closed) or a room resync means the
        // optimistic local canvas is out of step — take the truth from the DB.
        if (["epoch_full", "board_closed", "locked", "resync", "conflict", "forbidden"].includes(msg.code)) {
          void resyncFromRest();
        }
        break;
      }
    }
  };

  const onLocalStroke = (stroke: Stroke) => {
    if (!canDraw()) return;
    const sid = `${props.meId}-${Date.now()}-${(clientSeq += 1)}`;
    for (const payload of encodeStrokeSegments(stroke, sid)) {
      sendWs({ type: "stroke", payload, client_seq: (clientSeq += 1) });
    }
  };

  onMount(() => {
    connectWs();
  });

  onCleanup(() => {
    closedByUs = true;
    clearReconnect();
    if (ws) ws.close();
  });

  createEffect(() => props.onConnectionChange?.(wsState()));

  return (
    <div class="space-y-3">
      <Show when={notice()}>
        {(msg) => (
          <div class="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <IconAlert class="mt-0.5 h-5 w-5 shrink-0 text-destructive-text" />
            <p class="min-w-0 text-sm text-destructive-text">{msg()}</p>
          </div>
        )}
      </Show>

      <WhiteboardCanvas
        disabled={!canDraw()}
        onStroke={onLocalStroke}
        controllerRef={(c) => {
          controller = c;
        }}
      />
    </div>
  );
}
