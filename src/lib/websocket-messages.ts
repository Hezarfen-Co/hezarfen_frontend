import type { AttemptStatus } from "@/api/client";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isNullableNumber = (value: unknown): value is number | null => value === null || typeof value === "number";
const isAttemptStatus = (value: unknown): value is AttemptStatus =>
  value === "in_progress" || value === "submitted" || value === "expired";

export type ExamWsMessage =
  | { type: "state"; status: AttemptStatus; deadline: number | null; remaining_ms: number | null; now: number; answered: number; question_count: number }
  | { type: "saved"; question_id: string; updated_at: number; client_seq?: number }
  | { type: "finished"; finished_at: number }
  | { type: "expired" }
  | { type: "pong" }
  | { type: "error"; message: string; question_id?: string; client_seq?: number };

export function parseExamWsMessage(value: unknown): ExamWsMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "state" && isAttemptStatus(value.status) && isNullableNumber(value.deadline) && isNullableNumber(value.remaining_ms) && typeof value.now === "number" && typeof value.answered === "number" && typeof value.question_count === "number") return value as ExamWsMessage;
  if (value.type === "saved" && typeof value.question_id === "string" && typeof value.updated_at === "number" && (value.client_seq === undefined || typeof value.client_seq === "number")) return value as ExamWsMessage;
  if (value.type === "finished" && typeof value.finished_at === "number") return value as ExamWsMessage;
  if (value.type === "expired" || value.type === "pong") return value as ExamWsMessage;
  if (value.type === "error" && typeof value.message === "string" && (value.question_id === undefined || typeof value.question_id === "string") && (value.client_seq === undefined || typeof value.client_seq === "number")) return value as ExamWsMessage;
  return null;
}

export type BoardWsMessage =
  | { type: "state"; board: string; epoch: number; locked: boolean; closed_at: number | null; creator: string; participants: string[]; now: number }
  | { type: "strokes"; epoch: number; strokes: { id: string; author: string; payload: string }[] }
  | { type: "synced"; epoch: number; cursor: string | null }
  | { type: "stroke"; id: string; author: string; payload: string; epoch: number }
  | { type: "saved"; id: string; client_seq?: number }
  | { type: "pong" } | { type: "cleared"; epoch: number; by: string | null }
  | { type: "locked"; locked: boolean; by: string } | { type: "closed"; closed_at: number | null }
  | { type: "participants"; creator: string; participants: string[] } | { type: "deleted" }
  | { type: "error"; code: string; message: string; client_seq?: number };

export function parseBoardWsMessage(value: unknown): BoardWsMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "state" && typeof value.board === "string" && typeof value.epoch === "number" && typeof value.locked === "boolean" && isNullableNumber(value.closed_at) && typeof value.creator === "string" && isStringArray(value.participants) && typeof value.now === "number") return value as BoardWsMessage;
  if (value.type === "strokes" && typeof value.epoch === "number" && Array.isArray(value.strokes) && value.strokes.every((row) => isRecord(row) && typeof row.id === "string" && typeof row.author === "string" && typeof row.payload === "string")) return value as BoardWsMessage;
  if (value.type === "synced" && typeof value.epoch === "number" && (value.cursor === null || typeof value.cursor === "string")) return value as BoardWsMessage;
  if (value.type === "stroke" && typeof value.id === "string" && typeof value.author === "string" && typeof value.payload === "string" && typeof value.epoch === "number") return value as BoardWsMessage;
  if (value.type === "saved" && typeof value.id === "string" && (value.client_seq === undefined || typeof value.client_seq === "number")) return value as BoardWsMessage;
  if (value.type === "cleared" && typeof value.epoch === "number" && (value.by === null || typeof value.by === "string")) return value as BoardWsMessage;
  if (value.type === "locked" && typeof value.locked === "boolean" && typeof value.by === "string") return value as BoardWsMessage;
  if (value.type === "closed" && isNullableNumber(value.closed_at)) return value as BoardWsMessage;
  if (value.type === "participants" && typeof value.creator === "string" && isStringArray(value.participants)) return value as BoardWsMessage;
  if (value.type === "error" && typeof value.code === "string" && typeof value.message === "string" && (value.client_seq === undefined || typeof value.client_seq === "number")) return value as BoardWsMessage;
  if (value.type === "pong" || value.type === "deleted") return value as BoardWsMessage;
  return null;
}
