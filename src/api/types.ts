export type Role = "student" | "teacher" | "manager" | "admin";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type ExamKind = "homework" | "quiz" | "midterm" | "final" | "project" | "oral";
export type ExamMode = "sync" | "async";
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

export type Event = {
  id: string;
  creator: string;
  title: string;
  description: string;
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
};

export type Enrollment = {
  id: string;
  course: string;
  user: PersonRef;
  enrolled_by: PersonRef;
};

export type Exam = {
  id: string;
  creator: string;
  course: string;
  title: string;
  description: string;
  kind: ExamKind | string;
  weight: number;
  mode: ExamMode | string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
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
  deadline: number | null;
  remaining_ms: number | null;
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
  weight: number;
  mark: number;
  graded_by: string;
};

export type CourseMarks = {
  course: Course;
  results: MarkEntry[];
  average: number | null;
};

export type MarksReport = {
  user: string;
  courses: CourseMarks[];
  overall_average: number | null;
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
  status: AttemptStatus | "not_started";
  deadline: number | null;
  remaining_ms: number | null;
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
    in_progress: number;
    submitted: number;
    expired: number;
    graded?: number;
  };
};

export const EXAM_KINDS: ExamKind[] = [
  "homework",
  "quiz",
  "midterm",
  "final",
  "project",
  "oral",
];

export const EXAM_MODES: ExamMode[] = ["sync", "async"];

export const QUESTION_KINDS: QuestionKind[] = ["choice", "text"];
