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

/** Who a row points at: the id plus something a human can read. */
export interface PersonRef {
  id: string;
  username: string;
  /** "Name Surname" when the profile has either; null otherwise. */
  display_name: string | null;
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
  user: PersonRef;
  status: AttendanceStatus;
  marked_by: PersonRef;
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
  user: PersonRef;
  enrolled_by: PersonRef;
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

/**
 * How a scheduled exam is sat: `sync` (everyone shares one fixed window) or
 * `async` (each student starts inside the window and gets `duration_ms`).
 */
export type ExamMode = "sync" | "async";

export interface Exam {
  id: string;
  creator: string;
  course: string;
  title: string;
  description: string;
  kind: ExamKind;
  /** Counts `weight` times into the course average, 1–100. */
  weight: number;
  /** Null on an unscheduled (offline-graded) exam — so are the fields below. */
  mode: ExamMode | null;
  /** Window open, UTC unix-milliseconds. */
  starts_at: number | null;
  /** Window close, UTC unix-milliseconds. */
  ends_at: number | null;
  /** Per-student time budget in milliseconds (async exams only). */
  duration_ms: number | null;
}

export type AttemptStatus = "in_progress" | "submitted" | "expired";

/** The caller's sitting of an exam; `now` is the server clock at response time. */
export interface ExamAttempt {
  id: string;
  exam: string;
  user: PersonRef;
  started_at: number;
  finished_at: number | null;
  status: AttemptStatus;
  /** When the attempt closes, recomputed live from the exam's schedule. */
  deadline: number | null;
  /** `deadline - now`, floored at 0; null unless in progress. */
  remaining_ms: number | null;
  /** The caller's mark, once graded. */
  mark: number | null;
  answered: number;
  question_count: number;
  /** Server clock, UTC unix-milliseconds. */
  now: number;
}

export type QuestionKind = "choice" | "text";

/** A question as its author sees it — `correct` included. Teacher+ only. */
export interface ExamQuestion {
  id: string;
  exam: string;
  text: string;
  kind: QuestionKind;
  /** This question's share of the auto-score, 1–100. */
  points: number;
  /** The options of a `choice` question (2–10); null for `text`. */
  choices: string[] | null;
  /** Zero-based index of the right option; null for `text`. */
  correct: number | null;
}

/** A student's own saved answer, embedded in their question view. */
export interface AnswerState {
  selected: number | null;
  text: string | null;
  updated_at: number;
}

/** A question as the sitting student sees it: no `correct`, answer embedded. */
export interface AttemptQuestion {
  id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  answer: AnswerState | null;
}

export interface AnswerSaved {
  question: string;
  selected: number | null;
  text: string | null;
  updated_at: number;
}

/** One roster row of the teacher's live exam monitor. */
export interface LiveStudent {
  user: PersonRef;
  status: "not_started" | AttemptStatus;
  started_at: number | null;
  finished_at: number | null;
  deadline: number | null;
  remaining_ms: number | null;
  mark: number | null;
  answered: number;
  /** When this student last saved an answer; null before the first save. */
  last_activity: number | null;
}

export interface LiveCounts {
  enrolled: number;
  not_started: number;
  in_progress: number;
  submitted: number;
  expired: number;
  graded: number;
}

/** One SSE `snapshot` frame of `GET /exams/{id}/live/stream`. */
export interface ExamLive {
  exam: Exam;
  /** Server clock the snapshot was judged at. */
  now: number;
  question_count: number;
  counts: LiveCounts;
  students: LiveStudent[];
}

/** One row of a student's answer sheet, as the grader sees it. */
export interface StudentAnswer {
  question: string;
  selected: number | null;
  text: string | null;
  updated_at: number;
  /** Whether `selected` hits `correct`; null for text questions. */
  is_correct: boolean | null;
}

/** A student's full answer sheet with the machine's scoring suggestion. */
export interface AttemptAnswers {
  exam: string;
  user: PersonRef;
  answers: StudentAnswer[];
  /** Suggested score over choice questions — never the final mark. */
  auto_score: { earned: number; possible: number };
}

export interface ExamResult {
  id: string;
  exam: string;
  user: PersonRef;
  /** 0–100 inclusive. */
  mark: number;
  graded_by: PersonRef;
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
  /** Async per-student budget, minutes (backend: 60 s – 24 h in ms). */
  examDurationMin: { min: 1, max: 24 * 60 },
  questionText: 2_000,
  questionPoints: { min: 1, max: 100 },
  questionChoices: { min: 2, max: 10 },
  choiceText: 500,
  answerText: 10_000,
} as const;
