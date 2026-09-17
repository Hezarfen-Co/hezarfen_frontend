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
 display_name?: string | null;
 bio?: string | null;
 theme: UserTheme | null;
 language: UserLanguage | null;
 palette_color: string | null;
};

// PATCH /users/me and PATCH /users/{id}/profile take the same body: an omitted
// (or null) field is left alone, an empty string clears it.
export type ProfileUpdate = {
 name?: string | null;
 surname?: string | null;
 email?: string | null;
 phone?: string | null;
 birth_date?: string | null;
 display_name?: string | null;
 bio?: string | null;
 // The teacher's branş, by name from settings.branches.
 branch?: string | null;
};

// POST /users (admin): the school office opens an account directly. `role`
// defaults to student on the server; an existing person joins this school only
// when the password matches their credential (409 otherwise).
export type CreateUserInput = {
 username: string;
 password: string;
 role?: Role;
};

export type PersonRef = {
 id: string;
 username: string;
 display_name: string | null;
};

// The lifetime counter a badge reads. Badges sharing a stat form a ladder.
export type BadgeStat =
 | "homework_submitted"
 | "homework_on_time"
 | "exam_sat"
 | "pomodoro_finished"
 | "pomodoro_focus_ms"
 | "marks_given"
 | "lessons_held"
 | "pool_approved"
 | "pool_published"
 | "lessons_attended"
 | "high_mark"
 | "study_streak";

// One entry of the badge catalogue, served by GET /limits. The label and icon
// behind an id live in the client, exactly as they do for a role.
export type BadgeCatalogEntry = { id: string; stat: BadgeStat | string; threshold: number };

// A badge a person has earned. Awards are permanent and `earned_at` is the
// moment of first crossing, unix ms.
export type EarnedBadge = { id: string; earned_at: number };

export type AvatarMeta = { content_type: string; size: number };

export type ProfileClassRef = { id: string; name: string; grade: string | null };

export type ProfileCourseRef = { id: string; title: string; kind: CourseKind };

// Lifetime counters behind the badge ladders, plus the two live totals the
// capped `classes`/`courses` lists would otherwise hide.
export type ProfileStats = {
 pomodoro_sessions: number;
 pomodoro_focus_ms: number;
 courses: number;
 classes: number;
 homework_submitted_total: number;
 homework_on_time_total: number;
 exam_sat_total: number;
 pomodoro_finished_total: number;
 pomodoro_focus_ms_total: number;
 marks_given_total: number;
 lessons_held_total: number;
 pool_approved_total: number;
 pool_published_total: number;
 lessons_attended_total: number;
 high_mark_total: number;
 study_streak_total: number;
};

// A person's public profile. Readable by any authenticated account except a
// parent, who only reaches their own and their linked students'. Never carries
// email, phone or birth date at any role — those stay on GET /users/{id}.
export type Profile = {
 id: string;
 username: string;
 display_name: string | null;
 role: Role;
 bio: string | null;
 // The teacher's branş, one of settings.branches; null when unset.
 branch: string | null;
 avatar: AvatarMeta | null;
 // Capped at limits.user.max_profile_classes; stats.classes holds the true total.
 classes: ProfileClassRef[];
 // Capped at limits.user.max_profile_courses, and filtered to what the reader
 // may see; stats.courses holds the owner's true, unfiltered total.
 courses: ProfileCourseRef[];
 badges: EarnedBadge[];
 stats: ProfileStats;
};

export type Note = {
 id: string;
 title: string;
 content: string;
};

/** A note attached to a course; files reuse the personal note's `NoteFile` shape. */
export type CourseNote = {
 id: string;
 course: string;
 title: string;
 content: string;
};

/** One AI service output stored against a course note. `payload` is the
 * service's own shape — stored and served unread, rendered as JSON. */
export type RagOutput = {
 id: string;
 course_note: string;
 course: string;
 /** The note's file attachments the output was built from. */
 sources: string[];
 payload: unknown;
 /** When the backend stored it, epoch milliseconds. */
 generated_at: number;
};

export type NoteFile = {
 id: string;
 name: string;
 content_type: string;
 size: number;
};

/** The deployment operator behind a `builder.` session cookie — no role, no school. */
export type Builder = {
  id: string;
  username: string;
};

export type SchoolStatus = "active" | "suspended";

/** One school of the deployment, as the builder surface sees it. */
export type School = {
  slug: string;
  name: string;
  /** A suspended school refuses every one of its own users, login included. */
  status: SchoolStatus;
  /** UTC unix-milliseconds. */
  created_at: number;
  /** Bought modules, sorted by name. */
  modules: string[];
};

/** One school's entitlements, both halves of the catalog. */
export type SchoolModules = {
  enabled: string[];
  disabled: string[];
};

/** The caller's school entitlements: every switched-on module, sorted by name. */
export type EnabledModules = {
 enabled: string[];
};

export type ModuleCatalogEntry = {
 module: string;
 package: string;
 /** Modules that must be enabled alongside this one. */
 requires: string[];
};

export type ModuleCatalogPackage = {
 package: string;
 modules: string[];
};

/** The deployment's whole module catalog — identical for every school. */
export type ModuleCatalog = {
 modules: ModuleCatalogEntry[];
 packages: ModuleCatalogPackage[];
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
 starts_at: number | null; // effective window: the proposal whenever one is on the
 // row (accepted or not), else the slot's own time
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

export const BANK_QUESTION_LIMITS = {
 textMaxLen: 2000, // MAX_QUESTION_TEXT_LEN
 choiceTextMaxLen: 500, // MAX_CHOICE_TEXT_LEN
 minPoints: 1, // MIN_QUESTION_POINTS
 maxPoints: 100, // MAX_QUESTION_POINTS
 minChoices: 2, // MIN_QUESTION_CHOICES
 maxChoices: 10, // MAX_QUESTION_CHOICES
} as const;

// A catalog course: the school's course row, taught by nobody on its own. A
// sube attaches it (POST /classes/{id}/instances), which mints the Instance
// every exam, session, homework and enrollment keys on.
export type Course = {
 id: string;
 creator: PersonRef;
 title: string;
 description: string;
 kind: CourseKind;
 // How many instances teach it (how many sections took it).
 class_course_count: number;
 // Individual club/etut memberships on the catalog row itself.
 course_membership_count: number;
};

// One catalog course as one sube teaches it. This is what carries the roster,
// the exams, the sessions and the karne weight.
export type Instance = {
 id: string;
 class: string;
 course: string;
 // Weekly lesson hours; the instance's weight in the year's karne average.
 ders_saati: number;
 counts_toward_karne: boolean;
 enrollment_count: number;
 teachers: PersonRef[];
};

// A club/etut membership on the catalog course itself — the school-scoped
// tier, distinct from an instance's roster. A regular `course` has none.
export type CourseMembership = {
 id: string;
 course: string;
 user: PersonRef;
 added_by: PersonRef;
 created_at: number;
};

/** One sınıf-geçme pair: the grade label students move to at rollover. */
export type GradePromotion = {
 from_grade: string;
 to_grade: string;
};

// An academic year: the calendar structure dönemler and şubeler hang off.
// Archiving freezes it — no new şube, dönem or exam inside it, and no edit.
export type AcademicYear = {
 id: string;
 name: string;
 starts_at: number;
 ends_at: number;
 creator: string;
 grade_promotions: GradePromotion[];
 class_count: number;
 term_count: number;
 /** Archived at, UTC unix-millis; null while the year is open. */
 archived_at: number | null;
};

/** What one rollover carried into the target year. */
export type RolloverResult = {
 year: string;
 classes: number;
 students: number;
 /** Grade labels left behind because the year promotes them nowhere. */
 graduated: string[];
};

export type Term = {
 id: string;
 name: string;
 /** The academic year the dönem sits in. */
 year: string;
 starts_at: number;
 ends_at: number;
 /** Archived at, UTC unix-millis; null while the term is open. */
 archived_at: number | null;
};

export type Enrollment = {
 id: string;
 /** The instance (class x course) the student is enrolled in. */
 class_course: string;
 user: PersonRef;
 enrolled_by: PersonRef;
 // The class (ClassGroup id) that pumped this enrollment, or null for a
 // hand-placed row. A row with a source is swept when that class drops the
 // student or detaches the course; a null row is permanent.
 source: string | null;
};

// A class (şube): a named group of students, optionally tied to a term, that
// pumps the Cartesian product of its members × attached courses into real
// enrollment rows. See src/api/classes.
export type ClassGroup = {
 id: string;
 // null for a caller below teacher+ — the office's account names are not
 // theirs to learn (a student's own GET /classes/me, a parent's
 // GET /classes/user/{user}).
 creator: PersonRef | null;
 name: string;
 grade: string | null;
 // The academic year (AcademicYear id) the sube sits in; what binds it to a
 // karne and to the rollover. Null when none is set.
 year: string | null;
 // The class's homeroom teacher (sınıf öğretmeni); null when none is assigned.
 teacher: PersonRef | null;
};

// What POST /classes answers with: the created class, the (class, course)
// pairs its grade's blueprint could not attach, and the grade of the blueprint
// that stocked it. `skipped` is empty when the template took every course, and
// always empty when no template covered the grade; `stocked_from` is null in
// that second case.
export type CreateClassResponse = { class: ClassGroup; skipped: BlueprintSkip[]; stocked_from: string | null };

export type ClassMember = {
 id: string;
 class: string;
 user: PersonRef;
 added_by: PersonRef;
 // One stint: a leave-and-rejoin is a fresh row with a fresh id.
 joined_at: number;
 // Null while the stint is live; the roster routes only list live rows.
 left_at: number | null;
 // The şube a year rollover copied this member out of; null when placed by hand.
 source_class_group: string | null;
};

// The instance as the class routes return it: an Instance plus who attached
// the course to the sube.
export type ClassCourse = Instance & {
 attached_by: PersonRef;
};

// A grade blueprint: the set of courses every class at one grade takes. The
// grade label is the record's key, so there is at most one per grade. Creating
// or editing one applies it to every existing class at that grade right away.
export type ClassBlueprint = {
 grade: string;
 courses: string[];
 creator: PersonRef;
};

// One (class, course) pair a blueprint could not attach. Applying is
// best-effort: a pair that cannot land is reported here and the rest still go
// through. `reason` is backend English — localize it, never render it raw.
export type BlueprintSkip = {
 class: string;
 class_name: string;
 course: string;
 reason: string;
};

export type BlueprintResult = { blueprint: ClassBlueprint; skipped: BlueprintSkip[] };

export type BlueprintApplyResult = { skipped: BlueprintSkip[] };

/** One section measured against its grade's blueprint. */
export type BlueprintSectionStatus = {
 class: string;
 class_name: string;
 /** Template courses the section does not carry; empty when in sync. */
 missing: string[];
};

/** Every section at a grade with the template courses it is missing. */
export type BlueprintStatus = {
 grade: string;
 /** The template every section below is measured against. */
 courses: string[];
 matched: number;
 sections: BlueprintSectionStatus[];
};

export type CourseSession = {
 id: string;
 /** The instance this lesson belongs to. */
 class_course: string;
 teacher: PersonRef;
 topic: string;
 starts_at: number;
 ends_at: number | null;
};

export type SessionAttendance = {
 id: string;
 session: string;
 class_course: string;
 user: PersonRef;
 status: AttendanceStatus;
 marked_by: PersonRef;
};

export type Exam = {
 id: string;
 creator: string;
 /** The instance the exam is set in. */
 class_course: string;
 /** The dönem the exam is sat in; its marks count into that term's karne. */
 term: string;
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
 seq: number;
 mark: number;
 graded_by: PersonRef;
};

/** One option of a choice question. `id` is stable across edits, so its image survives. */
export type Choice = { id: string; text: string };

export type ExamQuestion = {
 id: string;
 exam: string;
 subject: string;
 text: string;
 kind: QuestionKind;
 points: number;
 choices: Choice[] | null;
 correct: string | null;
 image?: ImageMeta | null;
 choice_images?: (ImageMeta | null)[] | null;
 from_bank?: string | null; // bank template this question was added from, if any
 banked_as?: string | null; // bank template last created by saving this question, if any
};

/** `private`: owner + admins only. `school`: every teacher can see it and its answer key. */
export type BankVisibility = "private" | "school";

/** Reusable question stored in the school-wide question bank, outside any exam. */
export type BankQuestion = {
 id: string;
 owner: string; // user id
 owner_name: string;
 subject: string | null; // subject id (origin metadata); null once that subject is deleted
 subject_name: string;
 text: string;
 kind: QuestionKind;
 points: number;
 choices: Choice[] | null;
 correct: string | null;
 image?: ImageMeta | null;
 choice_images?: (ImageMeta | null)[] | null;
 source_exam?: string | null;
 visibility: BankVisibility; // new templates start "private"
 created_at: number; // UTC unix ms
 /**
  * How many exam questions were copied out of this template. Each copy is
  * detached, so editing the template never reaches them — this is the
  * divergence surface. List-only, exactly like `subject_name`/`owner_name`:
  * the single-template endpoints return 0.
  */
 used_count: number;
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
 selected?: string | null;
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
 choices: Choice[] | null;
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
 counted?: boolean | null;
 label?: string | null;
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
 /** The instance these marks belong to; two sections are two blocks. */
 instance: string;
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
 /** The instance these tallies belong to. */
 instance: string;
 course: Course;
 counts: AttendanceCounts;
};

/** The configured per-dönem absence limits; null per limit when unset. */
export type AbsenceLimits = {
 max_excused_days: number | null;
 max_unexcused_days: number | null;
};

// One dönem's devamsızlık. A *day* is a calendar day with at least one missed
// lesson — two absences in one day count once, the way the regulation counts.
export type TermAbsence = {
 term: string;
 name: string;
 absent_days: number;
 excused_days: number;
 unexcused_days: number;
 limits: AbsenceLimits;
 over_limit: boolean;
};

export type AttendanceReport = {
 user: string;
 events: AttendanceCounts;
 sessions: AttendanceCounts;
 courses: CourseAttendance[];
 devamsizlik: TermAbsence[];
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
 selected: string | null;
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

export type MealSlot = {
 name: string;
 serving_minute: number | null;
};

export type SchoolSettings = {
 exam_kinds: ExamKindSetting[];
 attendance_statuses: string[];
 grade_bands: GradeBand[];
 max_file_bytes: number;
 chatbot_history_turns: number;
 max_chatbot_threads: number;
 max_chatbot_message_len: number;
 meal_slots: MealSlot[];
 dietary_tags: string[];
 meal_cancel_cutoff_minutes: number | null;
 // The branş (teaching subject) vocabulary a profile's `branch` may name.
 // Empty = the school keeps no list, and no profile may carry one.
 branches: string[];
 /** What an absence may be excused as (raporlu/izinli/…). Empty = none named. */
 excuse_kinds: string[];
 /** Per-dönem excused-absence day limit; null = no limit configured. */
 max_excused_absent_days: number | null;
 /** Per-dönem unexcused-absence day limit; null = no limit configured. */
 max_unexcused_absent_days: number | null;
 // The school's IANA timezone; null = the deployment default
 // (Europe/Istanbul). It is the zone devamsızlık days are bucketed in.
 timezone: string | null;
};

export type Limits = {
 user: {
  min_username_len: number;
  max_username_len: number;
  username_separators: string[];
  reserved_usernames: string[];
  reserved_slugs: string[];
  min_password_len: number;
  max_password_len: number;
  min_slug_len: number;
  max_slug_len: number;
  max_school_name_len: number;
  max_name_len: number;
  max_display_name_len: number;
  max_bio_len: number;
  // Caps on what a profile read embeds, not on membership: the full lists
  // stay at /courses/me and /classes/me.
  max_profile_courses: number;
  max_profile_classes: number;
  max_email_len: number;
  min_phone_digits: number;
  max_phone_digits: number;
  palette_color_len: number;
  palette_color_pattern: string;
  roles: Role[];
  themes: UserTheme[];
  languages: UserLanguage[];
  session_duration_days: number;
 };
 badges: { catalog: BadgeCatalogEntry[]; high_mark_min: number };
 note: { max_title_len: number; max_content_len: number; max_files: number; max_course_note_files: number };
 file: {
  max_name_len: number;
  max_content_type_len: number;
  min_max_file_bytes: number;
  max_max_file_bytes: number;
  default_max_file_bytes: number;
  image_content_types: string[];
 };
 message: { max_subject_len: number; max_body_len: number; max_label_len: number };
 event: { max_title_len: number; max_description_len: number };
 course: {
  max_title_len: number;
  max_description_len: number;
  kinds: CourseKind[];
  max_subject_name_len: number;
  max_subject_description_len: number;
  max_session_topic_len: number;
  max_term_name_len: number;
  max_class_name_len: number;
  max_class_grade_len: number;
  max_class_members: number;
  max_class_courses: number;
  max_academic_year_name_len: number;
  min_ders_saati: number;
  max_ders_saati: number;
 };
 exam: {
  max_title_len: number;
  max_description_len: number;
  modes: ExamMode[];
  min_duration_ms: number;
  max_duration_ms: number;
  max_attempts: number;
  unlimited_attempts: number;
  question_kinds: QuestionKind[];
  max_question_text_len: number;
  min_question_points: number;
  max_question_points: number;
  min_question_choices: number;
  max_question_choices: number;
  max_choice_text_len: number;
  max_answer_text_len: number;
  min_mark: number;
  max_mark: number;
  ws_tick_secs: number;
  ws_max_question_id_len: number;
 };
 homework: {
  max_title_len: number;
  max_description_len: number;
  max_text_len: number;
  max_files_per_submission: number;
  max_assigned: number;
  statuses: string[];
 };
 question_pool: { max_title_len: number; max_body_len: number; max_solution_body_len: number };
 appointment: { max_note_len: number; max_reason_len: number; max_slot_occurrences: number };
 meal: {
  max_dish_name_len: number;
  max_dish_description_len: number;
  max_dishes_per_menu: number;
  max_dish_tags: number;
  max_menu_capacity: number;
  max_dietary_tags: number;
  max_dietary_note_len: number;
  max_dish_price_minor: number;
  max_ledger_amount_minor: number;
  max_ledger_method_len: number;
  max_ledger_note_len: number;
  max_cancel_cutoff_minutes: number;
  max_serving_minute: number;
  max_booking_attempts: number;
  booking_statuses: string[];
  attendance_statuses: string[];
  ledger_kinds: string[];
 };
 payment: {
  max_plan_name_len: number;
  max_plan_installments: number;
  max_assign_students: number;
  max_assign_writes: number;
  max_applied_lines: number;
  max_request_key_len: number;
  ledger_kinds: string[];
 };
 pomodoro: {
  min_counted_ms: number;
  max_counted_per_day: number;
  max_label_len: number;
 };
 chatbot: {
  max_message_len: number;
  max_thread_title_len: number;
  min_max_message_len: number;
  max_max_message_len: number;
  default_max_message_len: number;
  min_history_turns: number;
  max_history_turns: number;
  default_history_turns: number;
  min_max_threads: number;
  max_max_threads: number;
  default_max_threads: number;
 };
 board: {
  max_title_len: number;
  // People the creator may name onto one board. Every participant draws, so
  // this also bounds a room's writer count.
  max_participants: number;
  max_stroke_payload_len: number;
  max_epoch_strokes: number;
  max_board_strokes: number;
  max_boards_per_creator: number;
  stroke_kinds: string[];
  ws_tick_secs: number;
  ws_max_board_id_len: number;
 };
 settings: {
  max_list_len: number;
  max_item_len: number;
  min_exam_kind_weight: number;
  max_exam_kind_weight: number;
  max_grade_bands: number;
  max_grade_label_len: number;
  required_attendance_statuses: string[];
 };
 request: { max_page_limit: number; max_request_id_len: number; schedule_past_grace_ms: number; request_timeout_secs: number };
 rate: { window_secs: number; auth_per_minute: number; api_per_minute: number; chatbot_per_minute: number; rag_per_minute: number };
 // The RAG nest. Message length, thread titles, history depth and the thread
 // cap are the chatbot's own knobs, republished so a RAG client need not read
 // the chatbot group to bound its input.
 rag: {
  max_scope_pairs: number;
  max_citations: number;
  max_citation_pages: number;
  max_message_len: number;
  max_thread_title_len: number;
  min_max_message_len: number;
  max_max_message_len: number;
  default_max_message_len: number;
  min_history_turns: number;
  max_history_turns: number;
  default_history_turns: number;
  min_max_threads: number;
  max_max_threads: number;
  default_max_threads: number;
 };
};

// Fallbacks keep forms usable when the unauthenticated metadata request fails.
export const EXAM_KINDS: KnownExamKind[] = ["homework", "quiz", "midterm", "final", "project", "oral"];
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
 class_course: string;
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
 class_course: string;
 homework: string;
 title: string;
 subject: string;
 due_at: number;
 submitted: boolean;
 late: boolean;
 missing: boolean;
 result: HomeworkResult | null;
};

export type MealDish = {
 id: string;
 name: string;
 description: string | null;
 price_minor: number;
 tags: string[];
 conflicts: string[];
 created_at: number;
};

export type MealMenu = {
 id: string;
 date: string;
 slot: string;
 capacity: number | null;
 dishes: MealDish[];
 created_by: PersonRef;
 created_at: number;
};

export type MealBooking = {
 id: string;
 menu_id: string;
 student: PersonRef;
 booked_by: PersonRef;
 status: string;
 cancelled_at: number | null;
 created_at: number;
};

export type MealAttendance = {
 id: string;
 menu_id: string;
 student: PersonRef;
 status: string;
 marked_by: PersonRef;
 marked_at: number;
};

export type DietaryProfile = {
 student: PersonRef;
 tags: string[];
 note: string | null;
 updated_by: PersonRef | null;
 updated_at: number | null;
};

export type MealBalance = {
 student: PersonRef;
 balance_minor: number;
};

export type MealLedgerEntry = {
 id: string;
 student: PersonRef;
 kind: string;
 amount_minor: number;
 source: string | null;
 method: string | null;
 note: string | null;
 recorded_by: PersonRef;
 created_at: number;
};

// One instance's line on a karne: the dönem average, its band label, and the
// ders_saati it weighs into the year average with.
export type KarneInstance = {
 class_course: string;
 /** The catalog course's title — what a family reads. */
 course: string;
 ders_saati: number;
 average: number | null;
 band: string | null;
};

// A student's karne for one dönem. An archived dönem serves the snapshot the
// school froze when it closed; an open one computes live.
export type KarneReport = {
 user: string;
 term: string;
 instances: KarneInstance[];
 /** The ders_saati-weighted average; null while nothing is graded. */
 year_average: number | null;
 /** `gecti` / `kaldi`, or null with no average or no passing floor. */
 verdict: string | null;
};

/** One instance an exam is announced to beyond the one that owns it. */
export type ExamAudience = {
 instance: string;
 class: string;
 course: string;
};

export type RagThread = {
 id: string;
 title: string | null;
 created_at: number;
 updated_at: number;
};

export type RagMessageStatus = "pending" | "complete" | "failed";

// One citation behind a RAG answer. `[N]` in the answer's content resolves to
// the citation whose `n` is N. `file` is null when no file the asker may view
// claims the document — citable, just not openable.
export type RagCitation = {
 n: number;
 pages: number[];
 span_ids: string[];
 ders?: string | null;
 file?: string | null;
};

export type RagMessage = {
 id: string;
 thread_id: string;
 role: "user" | "assistant" | string;
 status: RagMessageStatus | string;
 /** Empty while `status` is `pending`. */
 content: string;
 /** True when the service declined to answer — a complete turn, not a failure. */
 abstained: boolean;
 /** The abstention's short machine code; "" on an ordinary answer. */
 reason: string;
 citations: RagCitation[];
 created_at: number;
 completed_at?: number | null;
 /** Set only when `status` is `failed`. Backend English — localize it. */
 error_code?: string | null;
};

/** One capability's live fleet on the AI bridge. */
export type AiCapabilityWorkers = {
 capability: string;
 workers: number;
 inflight: number;
};

// What the AI bridge can currently do. `enabled: false` is a discovery
// answer, not an error: the deployment simply runs no AI.
export type AiCapabilities = {
 enabled: boolean;
 protocol: string;
 capabilities: AiCapabilityWorkers[];
};

// ---------------------------------------------------------------------------
// insights — ZEKA's nightly read of a student
// ---------------------------------------------------------------------------

/** The weakest input's tier behind a computed row. Treat as an open set. */
export type InsightConfidence = "none" | "exploratory" | "stable" | string;

// One student's nightly summary. The four module members are ZEKA's own
// shapes, stored and served unread — read a member by name, never by
// position. `null` for a module the run could not compute: an empty object
// and a missing module are different claims, and only one of them is true.
export type InsightSummary = {
 attendance?: unknown | null;
 marks?: unknown | null;
 study?: unknown | null;
 submission?: unknown | null;
 confidence: InsightConfidence;
 /** Epoch milliseconds. The stamp to poll after asking for a recompute. */
 computed_at: number;
 /** Epoch milliseconds after which the sweep deletes the row. */
 retain_until: number;
};

// One entry of the attention list — a statement of fact about a window, not a
// judgement. Teacher-facing: the backend never returns it to the student it is
// about, nor to their parent, so it must never be rendered in a student view.
export type AttentionItem = {
 /** Which trigger fired: `attendance` | `homework` | `mark_trend` today. */
 trigger: string;
 /** The sentence written once at compute time — render it, do not rewrite it. */
 fact: string;
 /** The course the fact is about; `null` = school-wide. */
 course?: string | null;
 /** The window the fact covers, epoch milliseconds. */
 window_from: number;
 window_to: number;
 /** The numbers behind the fact, for the "neden?" panel. Never empty. */
 evidence: unknown;
};

// One recommendation card addressed to the caller. It carries no dismissal
// field by design: a dismissed card is filtered out of both card reads.
export type Recommendation = {
 id: string;
 /** The product family: `O1`…`O4` for students, `T3`/`T4` for teachers. */
 product: string;
 /** Which rule produced it, and which version of that rule. */
 rule_id: string;
 rule_version: number;
 /** The rule's optional scope segment; `null` when the rule has none. */
 scope?: string | null;
 /** The role gate the card was written for. */
 audience_role: Role | string;
 /** Who the card is about; `null` on a card addressed to its own subject. */
 about?: string | null;
 course?: string | null;
 /** The numbers behind the card, including the mandatory `limitation` line. */
 evidence: unknown;
 confidence: InsightConfidence;
 created_at: number;
 /** After this instant the card is past; expired rows are filtered out. */
 expires_at: number;
};

// One student × dimension × label row. `accuracy` is never shown alone: raw
// accuracy carries general ability, and `contrast` is the part specific to
// this segment.
export type SegmentProfile = {
 /** `bilissel_talep` | `dikkat_tuzagi` | `okuma_yuku`. Open set. */
 dimension: string;
 label: string;
 n_answers: number;
 n_correct: number;
 /** The segment's hit rate, `n_correct / n_answers`. */
 accuracy: number;
 /** The student's hit rate across all labelled items — the subtrahend. */
 overall_n_answers: number;
 overall_accuracy: number;
 /** `accuracy − overall_accuracy`. Negative = behind their own general level. */
 contrast: number;
 confidence: InsightConfidence;
 computed_at: number;
};

// One student's whole readable insight. Who sees what is decided by the
// backend, not the client: `attention` arrives empty for the subject's own
// view and for a linked parent, and `summary`/`segments` arrive empty when a
// teacher reads their own cards through /insights/me.
export type StudentInsight = {
 user_id: string;
 /** `null` until ZEKA has computed this student at least once. */
 summary?: InsightSummary | null;
 attention: AttentionItem[];
 cards: Recommendation[];
 segments: SegmentProfile[];
};

/** `running` | `ok` | `partial` | `failed` | `skipped`. Open set. */
export type InsightRunStatus = "running" | "ok" | "partial" | "failed" | "skipped" | string;

// One compute run, as the ledger keeps it. A `partial` run must be shown as
// such: some students were not processed.
export type InsightRun = {
 /** The run's key, `YYYY-MM-DD` — a re-run of the same night overwrites. */
 run_day: string;
 started_at: number;
 finished_at?: number | null;
 duration_ms?: number | null;
 status: InsightRunStatus;
 students_total: number;
 students_ok: number;
 students_failed: number;
 students_skipped: number;
 rows_written: number;
 /** Whether the run hit its time budget before finishing. */
 budget_exceeded: boolean;
 budget_ms: number;
 /** The students the budget ran out on; the next run starts here. */
 pending_students: string[];
 /** Modules that failed — so a section can be marked missing, not shown as a hole. */
 failed_modules: string[];
};

// ---------------------------------------------------------------------------
// podcast — narrating a course note
// ---------------------------------------------------------------------------

// Which narration to produce. `duz_okuma` is the service's default; the other
// two need the service's LLM key and are refused with 409 `llm_unavailable`
// without it.
export type PodcastFormat = "duz_okuma" | "tek_ogretici" | "ogrenci_hoca" | string;

/** The service's receipt for an accepted job. 202 — nothing is produced yet. */
export type PodcastJobReceipt = {
 /** The job id the service minted — every other door names it. */
 job_id: string;
 /** `queued` on a fresh job. */
 state: string;
 /** The service's own estimate of the job's duration, in seconds. */
 eta_secs: number;
};

/** One job's state, passed through verbatim. Poll it. */
export type PodcastJobStatus = {
 job_id: string;
 /** `queued` | `running` | `done` | `failed` | `cancelled`. */
 state: string;
 /** The pipeline stage the job is in. */
 stage: string;
 /** Fraction complete, `0.0..=1.0`. */
 progress: number;
 /** Set only once the job failed. Backend English — localize it. */
 error_code?: string | null;
};

/** A finished job's artifacts, passed through verbatim. */
export type PodcastJobArtifacts = {
 job_id: string;
 /** The produced audio, relative to the school's output root — feed it to
  * `podcastAudioUrl`, never to a fetch of your own. */
 audio_id: string;
 /** One entry per produced chapter; usually `[audio_id]`. */
 audio_ids: string[];
 duration_secs: number;
 script_id: string;
 /** One entry per script the audio was aligned to. */
 script_ids: string[];
 format: PodcastFormat;
};

/** The verdict on a cancel. `false` is not an error — see `postPodcastJobCancel`. */
export type PodcastCancelVerdict = {
 job_id: string;
 /** Whether *this call* cancelled something. */
 cancelled: boolean;
};
