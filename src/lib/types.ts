// Wire types and validation limits, mirroring the backend's DTOs and
// `constant.rs`. Keep these in sync with hezarfen_backend.

export type Role = "student" | "teacher" | "manager" | "admin";

/** Privilege order, lowest to highest — index = rank. */
export const ROLES: readonly Role[] = ["student", "teacher", "manager", "admin"];

export function atLeast(role: Role, required: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(required);
}

export interface User {
  id: string;
  username: string;
  role: Role;
  /** Personal info — null until filled in. `birth_date` is `YYYY-MM-DD`. */
  name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface AppEvent {
  id: string;
  creator: string;
  title: string;
  description: string;
  /** Unix milliseconds, or null when unscheduled. */
  starts_at: number | null;
  ends_at: number | null;
}

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface Attendance {
  id: string;
  event: string;
  user: string;
  status: AttendanceStatus;
  marked_by: string;
}

export interface Course {
  id: string;
  creator: string;
  title: string;
  description: string;
}

export interface Enrollment {
  id: string;
  course: string;
  user: string;
  enrolled_by: string;
}

/** Informational metadata only — `weight` drives the course average. */
export const EXAM_KINDS = [
  "homework",
  "quiz",
  "midterm",
  "final",
  "project",
  "oral",
] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export interface Exam {
  id: string;
  creator: string;
  course: string;
  title: string;
  description: string;
  kind: ExamKind;
  /** Counts `weight` times into the course average, 1–100. */
  weight: number;
}

export interface ExamResult {
  id: string;
  exam: string;
  user: string;
  /** 0–100 inclusive. */
  mark: number;
  graded_by: string;
}

export interface ExamStatistics {
  exam: string;
  /** Number of graded results. */
  graded: number;
  /** Plain mean of the graded marks; null while nothing is graded. */
  average: number | null;
  min: number | null;
  max: number | null;
}

/** One graded exam inside a course block of the marks report. */
export interface MarkEntry {
  exam: string;
  title: string;
  kind: ExamKind;
  weight: number;
  mark: number;
  graded_by: string;
}

export interface CourseMarks {
  course: Course;
  /** Graded results only — ungraded exams don't appear. */
  results: MarkEntry[];
  /** Σ(mark×weight) / Σ(weight); null while nothing is graded. */
  average: number | null;
}

export interface MarksReport {
  user: string;
  courses: CourseMarks[];
  /** Plain mean of the non-null course averages; null while none exist. */
  overall_average: number | null;
}

export const LIMITS = {
  username: { min: 3, max: 32 },
  password: { min: 6, max: 128 },
  personName: 100,
  email: 254,
  /** Digit count; a leading `+`, spaces, dashes, and parentheses are allowed. */
  phoneDigits: { min: 7, max: 15 },
  noteTitle: 200,
  noteContent: 10_000,
  eventTitle: 200,
  eventDescription: 2_000,
  examTitle: 200,
  examDescription: 2_000,
  courseTitle: 200,
  courseDescription: 2_000,
  mark: { min: 0, max: 100 },
  weight: { min: 1, max: 100 },
} as const;
