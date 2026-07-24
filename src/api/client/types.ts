export type { Page, PageParams } from "./page";

export type Role = "student" | "parent" | "teacher" | "manager" | "admin";
export type UserTheme = "light" | "dark";
export type UserLanguage = "tr" | "en";
export type CourseKind = "course" | "study" | "club" | string;
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

export type EventRosterEntry = {
  user: PersonRef;
  status: AttendanceStatus | null;
  marked_by: PersonRef | null;
};

export type EventRegistration = {
  event: string;
  user: PersonRef;
  registered_by: PersonRef;
};

export type AppointmentStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AppointmentSlot = {
  id: string;
  teacher: PersonRef;
  starts_at: number; // unix ms UTC
  ends_at: number; // unix ms UTC, half-open
  note: string | null;
  series: string | null; // null = one-off; shared id across a weekly series
  created_at: number;
};

export type Appointment = {
  id: string;
  slot: string;
  teacher: PersonRef | null; // null only if slot vanished
  requester: PersonRef;
  status: AppointmentStatus;
  reason: string;
  starts_at: number | null; // effective window (proposal if accepted, else slot's)
  ends_at: number | null;
  proposed_starts_at: number | null;
  proposed_ends_at: number | null;
  proposed_by: PersonRef | null;
  decided_by: PersonRef | null; // null while pending
  cancelled_by: PersonRef | null; // set only when status === "cancelled"
  cancel_reason: string | null; // optional reason, null when none given
  reject_reason: string | null; // optional reason when status === "rejected" (rejecter is decided_by)
  created_at: number;
};

export const APPOINTMENT_LIMITS = {
  noteMaxLen: 500, // MAX_APPOINTMENT_NOTE_LEN, empty allowed
  reasonMaxLen: 1000, // MAX_APPOINTMENT_REASON_LEN, non-blank required
  maxSlotOccurrences: 52, // MAX_SLOT_OCCURRENCES for repeat_weekly
} as const;

export type Course = {
  id: string;
  creator: PersonRef;
  teachers?: PersonRef[];
  title: string;
  description: string;
  kind: CourseKind;
  term: string | null;
  capacity: number | null;
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
  mode: ExamMode | string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
  max_attempts: number;
  allow_rejoin: boolean;
  allow_review: boolean;
  draft: boolean;
};

export type ImageMeta = {
  content_type: string;
  size: number;
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
  subject: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
  image?: ImageMeta | null;
  choice_images?: (ImageMeta | null)[] | null;
};

export type ExamAttempt = {
  id: string;
  exam: string;
  user: PersonRef;
  status: AttemptStatus;
  attempt: number;
  attempts_used: number;
  max_attempts: number;
  started_at: number;
  finished_at: number | null;
  deadline: number | null;
  remaining_ms: number | null;
  left_at: number | null;
  mark: number | null;
  answered: number;
  question_count: number;
  now: number;
};

export type AttemptAnswer = {
  selected?: number | null;
  text?: string | null;
  updated_at?: number;
  answer_image?: ImageMeta | null;
};

export type AttemptQuestionResponse = {
  id: string;
  subject: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  image?: ImageMeta | null;
  choice_images?: (ImageMeta | null)[] | null;
  answer: AttemptAnswer | null;
};

export type AttemptQuestion = AttemptQuestionResponse & { exam: string };

export type PomodoroSession = {
  id: string;
  user: string;
  started_at: number;
  finished_at: number | null;
  duration_ms: number | null;
};

export type PomodoroLog = {
  items: PomodoroSession[];
  total: number;
  limit: number | null;
  offset: number;
  total_focus_ms: number;
};

export type Subject = {
  id: string;
  course: string;
  name: string;
  description: string;
};

export type MarkEntry = {
  exam: string;
  title: string;
  kind: string;
  weight: number;
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
  exam: string;
  graded: number;
  average: number | null;
  min: number | null;
  max: number | null;
};

export type StudentAnswer = {
  question: string;
  selected: number | null;
  text: string | null;
  updated_at: number;
  is_correct: boolean | null;
  answer_image?: ImageMeta | null;
};

export type StudentAnswerSheet = {
  exam: string;
  user: PersonRef;
  answers: StudentAnswer[];
  auto_score: { earned: number; possible: number };
};

export type LiveRosterEntry = {
  user: PersonRef;
  status: AttemptStatus | "not_started" | "absent";
  attempt: number | null;
  attempts_used: number;
  deadline: number | null;
  remaining_ms: number | null;
  left_at: number | null;
  mark: number | null;
  answered: number;
  started_at: number | null;
  finished_at: number | null;
  last_activity: number | null;
};

export type LiveMonitor = {
  exam: Exam;
  now: number;
  question_count: number;
  students: LiveRosterEntry[];
  counts: {
    enrolled: number;
    not_started: number;
    absent: number;
    in_progress: number;
    submitted: number;
    expired: number;
    graded: number;
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

export type MessageFolder = "inbox" | "sent" | "archive" | "trash";

export type Message = {
  id: string;
  sender: PersonRef;
  sender_role: Role | null;
  recipient: PersonRef;
  recipient_role: Role | null;
  subject: string;
  body: string;
  sent_at: number;
  read: boolean;
  folder: MessageFolder;
  previous_folder?: MessageFolder | string | null;
  label: string | null;
};

export type Homework = {
  id: string;
  course: string;
  subject: string;
  title: string;
  description: string | null;
  due_at: number;
  assigned: string[] | null;
  created_by: string;
  created_at: number;
};

export type HomeworkFile = {
  id: string;
  name: string;
  content_type: string;
  size: number;
};

export type HomeworkResultStatus = "done" | "incomplete" | "missing" | string;

export type HomeworkResult = {
  status: HomeworkResultStatus;
  mark: number | null;
  graded_by: string;
  created_at: number;
};

export type HomeworkSubmission = {
  user: string;
  homework: string;
  text: string | null;
  submitted_at: number;
  updated_at: number;
  late: boolean;
  files: HomeworkFile[];
  result: HomeworkResult | null;
};

export type HomeworkRosterSubmission = Omit<HomeworkSubmission, "user" | "homework" | "result">;

export type HomeworkRosterEntry = {
  user: string;
  submission: HomeworkRosterSubmission | null;
  result: HomeworkResult | null;
  missing: boolean;
  unenrolled: boolean;
};

export type HomeworkReportEntry = {
  course: string;
  homework: string;
  title: string;
  subject: string;
  due_at: number;
  submitted: boolean;
  late: boolean;
  missing: boolean;
  result: HomeworkResult | null;
};
