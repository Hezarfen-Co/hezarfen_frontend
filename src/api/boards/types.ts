import type { PageParams } from "../client";

// A collaborative whiteboard. `creator` is always a participant but never
// appears in `participants`. `epoch` is the live-canvas generation (a clear
// bumps it); `closed_at` set => permanently read-only.
export type Board = {
  id: string;
  title: string;
  creator: string;
  participants: string[];
  locked: boolean;
  locked_by: string | null;
  locked_at: number | null;
  epoch: number;
  closed_at: number | null;
  created_at: number;
};

export type BoardStrokeKind = "stroke" | "clear";

// One row of the append-only stroke log. `payload` is the opaque serialized
// mark (null on a clear marker); `count` is the closed epoch's final stroke
// count, present only on a clear marker.
export type StrokeRow = {
  id: string;
  author: string;
  kind: BoardStrokeKind;
  payload: string | null;
  count: number | null;
  epoch: number;
  created_at: number;
};

// POST /boards rejects unknown keys (422) — send only these two fields.
export type CreateBoardBody = {
  title: string;
  participants?: string[];
};

// PATCH /boards/{id} rejects unknown keys (422). Send only the writable fields
// that changed: `title` (any participant), `participants`/`locked` (creator).
export type UpdateBoardBody = {
  title?: string;
  participants?: string[] | null;
  locked?: boolean;
};

// GET /boards/{id}/history: `epoch` narrows to one epoch; omit for whole life.
export type BoardHistoryParams = PageParams & { epoch?: number };
