// Typed HTTP client for the Hezarfen backend. One `request` primitive, then a
// thin endpoint map per resource. Failures always throw `ApiError` carrying the
// backend's `{ "error": "..." }` message and the HTTP status.

import type {
  AppEvent,
  Attendance,
  AttendanceStatus,
  Course,
  Enrollment,
  Exam,
  ExamResult,
  ExamStatistics,
  MarksReport,
  Note,
  Role,
  User,
} from "./types";

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
    throw new ApiError(0, "network error — is the backend up?");
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
    body: { title: string; description?: string; kind: string; weight: number },
  ) => post<Exam>(`/courses/${id}/exams`, body),
};

export const exams = {
  list: () => get<Exam[]>("/exams"),
  get: (id: string) => get<Exam>(`/exams/${id}`),
  // Creation lives under the course: `courses.createExam`.
  update: (
    id: string,
    body: { title?: string; description?: string; kind?: string; weight?: number },
  ) => patch<Exam>(`/exams/${id}`, body),
  remove: (id: string) => del(`/exams/${id}`),

  results: (id: string) => get<ExamResult[]>(`/exams/${id}/results`),
  myResult: (id: string) => get<ExamResult>(`/exams/${id}/result`),
  grade: (id: string, userId: string, mark: number) =>
    post<ExamResult>(`/exams/${id}/results`, { mark, user_id: userId }),
  removeResult: (id: string, userId: string) => del(`/exams/${id}/results/${userId}`),
  statistics: (id: string) => get<ExamStatistics>(`/exams/${id}/statistics`),
};

export const marks = {
  mine: () => get<MarksReport>("/marks/me"),
  forUser: (id: string) => get<MarksReport>(`/marks/${id}`),
};
