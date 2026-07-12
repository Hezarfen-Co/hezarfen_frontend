// Typed HTTP client for the Hezarfen backend. One `request` primitive, then a
// thin endpoint map per resource. Failures always throw `ApiError` carrying the
// backend's `{ "error": "..." }` message and the HTTP status.

import type {
  AnswerSaved,
  AppEvent,
  Attendance,
  AttendanceStatus,
  AttemptAnswers,
  AttemptQuestion,
  Course,
  Enrollment,
  Exam,
  ExamAttempt,
  ExamLive,
  ExamQuestion,
  ExamResult,
  ExamStatistics,
  MarksReport,
  Note,
  PersonRef,
  Role,
  User,
} from "./types";

import { t } from "./i18n";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSecs?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, t("networkError"));
  }

  if (!res.ok) {
    let message = res.statusText.toLowerCase() || "request failed";
    try {
      message = ((await res.json()) as { error: string }).error;
    } catch {
      // Non-JSON error body; keep the status text.
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new ApiError(res.status, message, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
const del = (path: string) => request<void>("DELETE", path);

export interface Credentials {
  username: string;
  password: string;
}

export const auth = {
  me: () => get<User>("/auth/me"),
  register: (credentials: Credentials) => post<User>("/auth/register", credentials),
  login: (credentials: Credentials) => post<User>("/auth/login", credentials),
  logout: () => post<void>("/auth/logout"),
};

/** Partial profile update: omit a field to keep it, send `""` to clear it. */
export interface ProfilePatch {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  /** `YYYY-MM-DD`. */
  birth_date?: string;
}

export const users = {
  list: () => get<User[]>("/users"),
  get: (id: string) => get<User>(`/users/${id}`),
  /** Fragment search over username/name/surname; teacher+, max 10 rows. */
  search: (q: string) => get<PersonRef[]>(`/users/search?q=${encodeURIComponent(q)}`),
  setRole: (id: string, role: Role) => patch<User>(`/users/${id}/role`, { role }),
  /** The caller's own profile. */
  updateMyProfile: (body: ProfilePatch) => patch<User>("/users/me", body),
  /** Any user's profile; admin only. */
  updateProfile: (id: string, body: ProfilePatch) => patch<User>(`/users/${id}/profile`, body),
};

export const notes = {
  list: () => get<Note[]>("/notes"),
  create: (body: { title: string; content?: string }) => post<Note>("/notes", body),
  update: (id: string, body: { title?: string; content?: string }) =>
    patch<Note>(`/notes/${id}`, body),
  remove: (id: string) => del(`/notes/${id}`),
};

export const events = {
  list: () => get<AppEvent[]>("/events"),
  get: (id: string) => get<AppEvent>(`/events/${id}`),
  create: (body: {
    title: string;
    description?: string;
    starts_at?: number;
    ends_at?: number;
  }) => post<AppEvent>("/events", body),
  /** `null` clears a timestamp; omitting a field keeps it. */
  update: (
    id: string,
    body: {
      title?: string;
      description?: string;
      starts_at?: number | null;
      ends_at?: number | null;
    },
  ) => patch<AppEvent>(`/events/${id}`, body),
  remove: (id: string) => del(`/events/${id}`),

  attendance: (id: string) => get<Attendance[]>(`/events/${id}/attendance`),
  mark: (id: string, status: AttendanceStatus, userId?: string) =>
    post<Attendance>(`/events/${id}/attendance`, { status, user_id: userId }),
  unmark: (id: string, userId: string) => del(`/events/${id}/attendance/${userId}`),
};

export const courses = {
  list: () => get<Course[]>("/courses"),
  /** The caller's enrolled courses. */
  mine: () => get<Course[]>("/courses/me"),
  get: (id: string) => get<Course>(`/courses/${id}`),
  create: (body: { title: string; description?: string }) => post<Course>("/courses", body),
  update: (id: string, body: { title?: string; description?: string }) =>
    patch<Course>(`/courses/${id}`, body),
  remove: (id: string) => del(`/courses/${id}`),

  roster: (id: string) => get<Enrollment[]>(`/courses/${id}/enrollments`),
  enroll: (id: string, userId: string) =>
    post<Enrollment>(`/courses/${id}/enrollments`, { user_id: userId }),
  unenroll: (id: string, userId: string) => del(`/courses/${id}/enrollments/${userId}`),

  exams: (id: string) => get<Exam[]>(`/courses/${id}/exams`),
  createExam: (
    id: string,
    body: {
      title: string;
      description?: string;
      kind: string;
      weight: number;
      /** Schedule as a unit: all null for an unscheduled exam. */
      mode: string | null;
      starts_at: number | null;
      ends_at: number | null;
      duration_ms: number | null;
    },
  ) => post<Exam>(`/courses/${id}/exams`, body),
};

export const exams = {
  list: () => get<Exam[]>("/exams"),
  get: (id: string) => get<Exam>(`/exams/${id}`),
  // Creation lives under the course: `courses.createExam`.
  /** Schedule fields are set-or-clear: explicit `null` clears, omit keeps. */
  update: (
    id: string,
    body: {
      title?: string;
      description?: string;
      kind?: string;
      weight?: number;
      mode?: string | null;
      starts_at?: number | null;
      ends_at?: number | null;
      duration_ms?: number | null;
    },
  ) => patch<Exam>(`/exams/${id}`, body),
  remove: (id: string) => del(`/exams/${id}`),

  results: (id: string) => get<ExamResult[]>(`/exams/${id}/results`),
  myResult: (id: string) => get<ExamResult>(`/exams/${id}/result`),
  grade: (id: string, userId: string, mark: number) =>
    post<ExamResult>(`/exams/${id}/results`, { mark, user_id: userId }),
  removeResult: (id: string, userId: string) => del(`/exams/${id}/results/${userId}`),
  statistics: (id: string) => get<ExamStatistics>(`/exams/${id}/statistics`),

  // ---- attempts: sitting a scheduled exam ----
  /** Start or resume — the backend never resets a running clock. */
  startAttempt: (id: string) => post<ExamAttempt>(`/exams/${id}/attempt`),
  /** 404 until started. */
  myAttempt: (id: string) => get<ExamAttempt>(`/exams/${id}/attempt`),
  finishAttempt: (id: string) => post<ExamAttempt>(`/exams/${id}/attempt/finish`),
  /** The sitting student's questions (no `correct`), own answers embedded. */
  attemptQuestions: (id: string) => get<AttemptQuestion[]>(`/exams/${id}/attempt/questions`),
  saveAnswer: (id: string, body: { question_id: string; selected?: number; text?: string }) =>
    post<AnswerSaved>(`/exams/${id}/attempt/answers`, body),

  // ---- questions: authored by teacher+ with course-management rights ----
  questions: (id: string) => get<ExamQuestion[]>(`/exams/${id}/questions`),
  createQuestion: (
    id: string,
    body: {
      text: string;
      kind: string;
      points: number;
      choices: string[] | null;
      correct: number | null;
    },
  ) => post<ExamQuestion>(`/exams/${id}/questions`, body),
  /** `choices`/`correct` are set-or-clear; send the full kind unit. */
  updateQuestion: (
    id: string,
    qid: string,
    body: {
      text?: string;
      points?: number;
      kind?: string;
      choices?: string[] | null;
      correct?: number | null;
    },
  ) => patch<ExamQuestion>(`/exams/${id}/questions/${qid}`, body),
  removeQuestion: (id: string, qid: string) => del(`/exams/${id}/questions/${qid}`),

  // ---- live monitor (teacher+) ----
  live: (id: string) => get<ExamLive>(`/exams/${id}/live`),
  /** SSE endpoint for `EventSource` — one `snapshot` event every ~2 s. */
  liveStreamUrl: (id: string) => `${BASE}/exams/${id}/live/stream`,
  /** One student's judged answer sheet with the auto-score suggestion. */
  attemptAnswers: (id: string, userId: string) =>
    get<AttemptAnswers>(`/exams/${id}/attempts/${userId}/answers`),
  /** The student exam room WebSocket (autosave acks + server countdown). */
  attemptSocketUrl: (id: string) => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = BASE.startsWith("http") ? BASE.replace(/^http/, "ws") : `${proto}//${window.location.host}${BASE}`;
    return `${base}/exams/${id}/attempt/ws`;
  },
};

export const marks = {
  mine: () => get<MarksReport>("/marks/me"),
  forUser: (id: string) => get<MarksReport>(`/marks/${id}`),
};

export const meta = {
  /** Server clock, UTC unix-milliseconds — see `lib/clock.ts`. */
  time: () => get<{ now: number }>("/time"),
};
