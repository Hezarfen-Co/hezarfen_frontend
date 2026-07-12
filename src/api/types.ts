export type Role = "student" | "teacher" | "manager" | "admin";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type ExamKind = "homework" | "quiz" | "midterm" | "final" | "project" | "oral";
export type ExamMode = "sync" | "async";
export type QuestionKind = "choice" | "text";

export type User = {
  id: string;
  username: string;
  role: Role;
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
  user: string;
  status: AttendanceStatus;
  marked_by: string;
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
  user: string;
  mark: number;
  graded_by: string;
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
