export type { Page, PageParams } from "./page";

export type Role = "student" | "teacher" | "manager" | "admin";
export type UserTheme = "light" | "dark";
export type UserLanguage = "tr" | "en";
export type CourseKind = "course" | "study" | string;
export type CoreAttendanceStatus = "present" | "absent" | "late" | "excused";
export type AttendanceStatus = CoreAttendanceStatus | string;
export type KnownExamKind = "homework" | "quiz" | "midterm" | "final" | "project" | "oral";
export type ExamKind = KnownExamKind | string;
export type ExamMode = "sync" | "async" | "open";
export type QuestionKind = "choice" | "text";
export type AttemptStatus = "in_progress" | "submitted" | "expired";

export type User = {
  id: string;
  username: string;
  role: Role;
  name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  theme: UserTheme | null;
  language: UserLanguage | null;
};

export type ProfileUpdate = {
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
};

export type PersonRef = {
  id: string;
  username: string;
  display_name: string | null;
};

export type Note = {
  id: string;
  title: string;
  content: string;
};

export type NoteFile = {
  id: string;
  name: string;
  content_type: string;
  size: number;
};

export type EventAudience =
  | { kind: "school" }
  | { kind: "role"; role: Role }
  | { kind: "course"; course: string }
  | { kind: "registration"; capacity?: number | null };

export type Event = {
  id: string;
  creator: string;
  title: string;
  description: string;
  audience: EventAudience;
  starts_at: number | null;
  ends_at: number | null;
};

export type Attendance = {
  id: string;
  event: string;
  user: PersonRef;
  status: AttendanceStatus;
  marked_by: PersonRef;
};

export type Course = {
  id: string;
  creator: string;
  title: string;
  description: string;
  kind: CourseKind;
  /** Academic term id from API (`CourseResponse.term`). */
  term?: string | null;
};

export type Term = {
  id: string;
  name: string;
  starts_at: number;
  ends_at: number;
};

export type Enrollment = {
  id: string;
  course: string;
  user: PersonRef;
  enrolled_by: PersonRef;
};

export type CourseSession = {
  id: string;
  course: string;
  teacher: PersonRef;
  topic: string;
  starts_at: number;
  ends_at: number | null;
};

export type SessionAttendance = {
  id: string;
  session: string;
  course: string;
  user: PersonRef;
  status: AttendanceStatus;
  marked_by: PersonRef;
};

export type Exam = {
  id: string;
  creator: string;
  course: string;
  title: string;
  description: string;
  kind: ExamKind | string;
  weight?: number | null;
  kind_weight?: number | null;
  type_weight?: number | null;
  exam_type_weight?: number | null;
  mode: ExamMode | string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
  max_attempts?: number | null;
  allow_rejoin?: boolean | null;
};

export type ExamResult = {
  id: string;
  exam: string;
  user: PersonRef;
  mark: number;
  graded_by: PersonRef;
};

export type ExamQuestion = {
  id: string;
  exam: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
};

export type ExamAttempt = {
  id?: string;
  exam?: string;
  user?: PersonRef;
  status: AttemptStatus;
  attempt?: number;
  attempts_used?: number;
  max_attempts?: number;
  deadline: number | null;
  remaining_ms: number | null;
  left_at?: number | null;
  mark: number | null;
  answered: number;
  question_count: number;
  now: number;
};

export type AttemptAnswer = {
  selected?: number | null;
  text?: string | null;
  updated_at?: number;
};

export type AttemptQuestion = {
  id: string;
  exam: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  answer: AttemptAnswer | null;
};

export type MarkEntry = {
  exam: string;
  title: string;
  kind: string;
  weight?: number | null;
  kind_weight?: number | null;
  type_weight?: number | null;
  exam_type_weight?: number | null;
  mark: number;
  grade?: string | null;
  graded_by: string;
};

export type CourseMarks = {
  course: Course;
  results: MarkEntry[];
  average: number | null;
  average_grade?: string | null;
};

export type AttendanceCounts = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  custom: Record<string, number>;
  total: number;
  rate: number | null;
};

export type CourseAttendance = {
  course: Course;
  counts: AttendanceCounts;
};

export type AttendanceReport = {
  user: string;
  events: AttendanceCounts;
  sessions: AttendanceCounts;
  courses: CourseAttendance[];
};

export type WorkEntry = {
  id: string;
  user: string;
  check_in: number;
  check_out: number | null;
  duration_ms: number | null;
};

export type MarksReport = {
  user: string;
  courses: CourseMarks[];
  overall_average: number | null;
  overall_grade?: string | null;
};

export type ExamStatistics = {
  graded: number;
  average: number | null;
  min: number | null;
  max: number | null;
};

export type GradedAnswer = {
  question_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
  selected: number | null;
  text_answer: string | null;
  is_correct: boolean | null;
  auto_score: { earned: number; possible: number };
};

export type StudentAnswerSheet = {
  user: PersonRef;
  answers: GradedAnswer[];
  auto_score: { earned: number; possible: number };
};

export type LiveRosterEntry = {
  user: PersonRef;
  status: AttemptStatus | "not_started" | "absent";
  attempt?: number | null;
  attempts_used?: number | null;
  max_attempts?: number | null;
  deadline: number | null;
  remaining_ms: number | null;
  left_at?: number | null;
  mark: number | null;
  answered: number;
  started_at?: number | null;
  finished_at?: number | null;
  last_activity: number | null;
};

export type LiveMonitor = {
  exam: Exam;
  now: number;
  question_count: number;
  students: LiveRosterEntry[];
  counts: {
    enrolled?: number;
    not_started: number;
    absent?: number;
    in_progress: number;
    submitted: number;
    expired: number;
    graded?: number;
  };
};

export type ExamKindSetting = {
  name: string;
  weight: number;
};

export type GradeBand = {
  min: number;
  label: string;
};

export type SchoolSettings = {
  exam_kinds: ExamKindSetting[];
  attendance_statuses: string[];
  grade_bands: GradeBand[];
  max_file_bytes: number;
};

export const EXAM_KINDS: KnownExamKind[] = [
  "homework",
  "quiz",
  "midterm",
  "final",
  "project",
  "oral",
];

export const EXAM_MODES: ExamMode[] = ["sync", "async", "open"];

export const QUESTION_KINDS: QuestionKind[] = ["choice", "text"];
