import type { Component } from "solid-js";
import type { Role } from "@/api/client";
import {
  IconArchive,
  IconBook,
  IconBriefcase,
  IconCalendarBlank,
  IconCalendarCheck,
  IconCalendarDays,
  IconCalendarStar,
  IconChalkboardTeacher,
  IconChart,
  IconChartPie,
  IconClipboardCheck,
  IconClockUser,
  IconEdit,
  IconExam,
  IconHandshake,
  IconHelpCircle,
  IconHome,
  IconHomework,
  IconListChecks,
  IconMessage,
  IconNote,
  IconPackage,
  IconReportAnalytics,
  IconScan,
  IconSchool,
  IconSettings,
  IconShieldCheck,
  IconSparkles,
  IconTarget,
  IconTimer,
  IconUserCog,
  IconUsers,
  IconUtensils,
  IconWaveform,
} from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { hasExactRole, roleInRange } from "@/lib/roles";

export type NavItem = {
  id: string;
  to: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  minRole?: Role;
  maxRole?: Role;
  exactRole?: Role;
  exact?: boolean;
  /**
   * Search params the entry links with (`/questions?status=pending`). It is
   * active only while the URL carries them, and then wins over a plain entry
   * for the same path.
   */
  search?: Record<string, string>;
  /** Backend module nest behind this entry; hidden when the school did not buy it. */
  module?: string;
  /** No backend yet — routes to the shared placeholder and carries a "yakında" badge. */
  soon?: boolean;
  /** Opens an existing shell surface instead of navigating (the Çelebi panel,
   *  the account settings dialog) — both already live elsewhere in the shell. */
  action?: "celebi" | "profile";
};

export type NavGroup = {
  id: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  items: NavItem[];
  /** Starts folded in the sidebar until the viewer opens it (the "yakında" shelf). */
  defaultFolded?: boolean;
};

export const HOME_ITEM: NavItem = {
  id: "today",
  to: "/",
  labelKey: "nav.today",
  Icon: IconHome,
  exact: true,
};

const AI_STUDIO_ITEM: NavItem = {
  id: "ai-studio",
  to: "/ai/studio",
  labelKey: "aiHub.tab.studio",
  Icon: IconWaveform,
  module: "course_notes",
};

const AI_STUDY_ITEM: NavItem = {
  id: "ai-study",
  to: "/ai/study",
  labelKey: "aiHub.tab.study",
  Icon: IconBook,
};

const AI_INSIGHTS_ITEM: NavItem = {
  id: "ai-insights",
  to: "/ai/insights",
  labelKey: "aiHub.tab.insights",
  Icon: IconChart,
};

const AI_CELEBI_ITEM: NavItem = {
  id: "ai-celebi",
  to: "",
  labelKey: "nav.celebi",
  Icon: IconSparkles,
  action: "celebi",
  module: "chatbot",
};

const AI_GROUP: NavGroup = {
  id: "ai",
  labelKey: "nav.group.ai",
  Icon: IconSparkles,
  items: [AI_STUDIO_ITEM, AI_STUDY_ITEM, AI_INSIGHTS_ITEM, AI_CELEBI_ITEM],
};

// A teacher's student analysis is the same board, listed under Tracking as
// "Öğrenci analizi" — so their AI group leaves it out instead of listing it twice.
const TEACHER_AI_GROUP: NavGroup = {
  id: "ai",
  labelKey: "nav.group.ai",
  Icon: IconSparkles,
  items: [AI_STUDIO_ITEM, AI_STUDY_ITEM, AI_CELEBI_ITEM],
};

const PARENT_AI_GROUP: NavGroup = {
  id: "ai",
  labelKey: "nav.group.ai",
  Icon: IconSparkles,
  items: [AI_INSIGHTS_ITEM],
};

function settingsAction(id: string): NavItem {
  return { id, to: "", labelKey: "nav.settings", Icon: IconSettings, action: "profile" };
}

// Every role's tree is short, labelled sections that stay open (Fintables
// style) instead of a few accordions hiding 20 entries each. Entries without a
// backend yet all move to one trailing "Yakında" section, folded by default, so
// they stay visible without crowding the live pages.
function soonGroup(items: NavItem[]): NavGroup {
  return { id: "soon", labelKey: "nav.soon", Icon: IconTarget, items, defaultFolded: true };
}

// Admin and manager share one tree — manager just qualifies for fewer of its
// items, via the same minRole gates the rest of this file already uses.
const ADMIN_GROUPS: NavGroup[] = [
  AI_GROUP,
  {
    id: "school",
    labelKey: "nav.group.school",
    Icon: IconSchool,
    items: [
      { id: "students-roster", to: "/management/students", labelKey: "nav.studentsRoster", Icon: IconUsers, minRole: "manager" },
      { id: "teachers-roster", to: "/management/teachers", labelKey: "nav.teachersRoster", Icon: IconChalkboardTeacher, minRole: "manager" },
      { id: "class-groups", to: "/management/classes", labelKey: "nav.classGroups", Icon: IconSchool, minRole: "teacher", module: "classes" },
      { id: "academic-years", to: "/management/academic-years", labelKey: "nav.academicYears", Icon: IconCalendarBlank, minRole: "manager" },
      { id: "terms", to: "/management/terms", labelKey: "nav.terms", Icon: IconCalendarCheck, minRole: "manager" },
      { id: "schedule", to: "/calendar", labelKey: "nav.schedule", Icon: IconCalendarDays, minRole: "manager" },
    ],
  },
  {
    id: "teaching",
    labelKey: "nav.group.teaching",
    Icon: IconBook,
    items: [
      { id: "courses", to: "/courses", labelKey: "nav.classes", Icon: IconBook, module: "courses" },
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework, module: "homework" },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, minRole: "teacher", module: "exams" },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, minRole: "teacher", module: "bank_questions" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
    ],
  },
  {
    id: "tracking",
    labelKey: "nav.group.tracking",
    Icon: IconClipboardCheck,
    items: [
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.studentAttendance", Icon: IconClipboardCheck, minRole: "teacher", module: "attendance" },
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher", module: "marks" },
      { id: "student-pomodoros", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconTimer, minRole: "teacher", module: "pomodoro" },
    ],
  },
  {
    id: "services",
    labelKey: "nav.group.services",
    Icon: IconCalendarDays,
    items: [
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarStar, module: "events" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconHandshake, module: "appointments" },
      { id: "school-meals", to: "/meals", labelKey: "nav.schoolMeals", Icon: IconUtensils, minRole: "manager", module: "meals" },
    ],
  },
  {
    id: "institution",
    labelKey: "nav.group.institution",
    Icon: IconUserCog,
    items: [
      { id: "payments-collection", to: "/management/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, minRole: "manager", module: "payments" },
      { id: "staff-work", to: "/management/staff-work", labelKey: "nav.staffWork", Icon: IconBriefcase, minRole: "manager", module: "work" },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconClockUser, minRole: "teacher", module: "work" },
      { id: "users", to: "/admin/users", labelKey: "nav.users", Icon: IconUserCog, minRole: "admin" },
      { id: "license-modules", to: "/management/modules", labelKey: "nav.licenseModules", Icon: IconPackage, minRole: "admin" },
      { id: "settings", to: "/management/settings", labelKey: "settings.title", Icon: IconSettings, minRole: "manager" },
    ],
  },
  soonGroup([
    { id: "mock-exams", to: "/coming-soon/deneme-sinavlari", labelKey: "nav.mockExams", Icon: IconTarget, soon: true, minRole: "manager" },
    { id: "optical-reading", to: "/coming-soon/optik-okuma", labelKey: "nav.opticalReading", Icon: IconScan, soon: true, minRole: "manager" },
    { id: "reports", to: "/coming-soon/raporlar", labelKey: "nav.reports", Icon: IconChartPie, soon: true, minRole: "manager" },
    { id: "data-protection", to: "/coming-soon/kvkk-denetim", labelKey: "nav.dataProtection", Icon: IconShieldCheck, soon: true, minRole: "admin" },
  ]),
];

const TEACHER_GROUPS: NavGroup[] = [
  TEACHER_AI_GROUP,
  {
    id: "my-classroom",
    labelKey: "nav.group.myClassroom",
    Icon: IconSchool,
    items: [
      { id: "my-classes", to: "/management/classes", labelKey: "nav.myClasses", Icon: IconSchool, module: "classes" },
      { id: "my-schedule", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "courses", to: "/courses", labelKey: "nav.classes", Icon: IconBook, module: "courses" },
    ],
  },
  {
    id: "tracking",
    labelKey: "nav.group.tracking",
    Icon: IconClipboardCheck,
    items: [
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.studentAttendance", Icon: IconClipboardCheck, module: "attendance" },
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, module: "marks" },
      { id: "student-pomodoros", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconTimer, module: "pomodoro" },
      { id: "student-analysis", to: "/ai/insights", labelKey: "nav.studentAnalysis", Icon: IconChart },
    ],
  },
  {
    id: "teaching",
    labelKey: "nav.group.teaching",
    Icon: IconBook,
    items: [
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework, module: "homework" },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, module: "exams" },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, module: "bank_questions" },
      { id: "question-generation", to: "/ai/question-generation", labelKey: "nav.questionGeneration", Icon: IconSparkles },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      // The pool's own pending tab: for a teacher, `?status=pending` is the
      // approval queue (`POST /questions/{id}/approve`).
      { id: "pending-approvals", to: "/questions", search: { status: "pending" }, labelKey: "nav.pendingApprovals", Icon: IconClipboardCheck, module: "questions" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
    ],
  },
  {
    id: "other",
    labelKey: "nav.group.other",
    Icon: IconMessage,
    items: [
      { id: "parent-communication", to: "/messages", labelKey: "nav.parentCommunication", Icon: IconMessage, module: "messages" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconHandshake, module: "appointments" },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarStar, module: "events" },
      { id: "meals", to: "/meals", labelKey: "nav.meals", Icon: IconUtensils, module: "meals" },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconClockUser, minRole: "teacher", module: "work" },
      settingsAction("settings-teacher"),
    ],
  },
];

const STUDENT_GROUPS: NavGroup[] = [
  AI_GROUP,
  {
    id: "study",
    labelKey: "nav.group.study",
    Icon: IconSchool,
    items: [
      { id: "topic-mastery", to: "/marks", labelKey: "nav.topicMastery", Icon: IconChart, exactRole: "student", module: "marks" },
      { id: "exam-results", to: "/exams", labelKey: "nav.examResults", Icon: IconExam, module: "exams" },
      { id: "my-homework", to: "/homework", labelKey: "nav.myHomework", Icon: IconHomework, module: "homework" },
      { id: "pomodoro", to: "/pomodoro", labelKey: "nav.pomodoro", Icon: IconTimer, exactRole: "student", module: "pomodoro" },
    ],
  },
  {
    id: "teaching",
    labelKey: "nav.group.teaching",
    Icon: IconBook,
    items: [
      { id: "courses", to: "/courses", labelKey: "nav.classes", Icon: IconBook, module: "courses" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
    ],
  },
  {
    id: "other",
    labelKey: "nav.group.other",
    Icon: IconCalendarDays,
    items: [
      { id: "calendar", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarStar, module: "events" },
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage, module: "messages" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconHandshake, module: "appointments" },
      { id: "meals", to: "/meals", labelKey: "nav.meals", Icon: IconUtensils, module: "meals" },
      settingsAction("settings-student"),
    ],
  },
  soonGroup([
    { id: "study-plan", to: "/coming-soon/calisma-programim", labelKey: "nav.studyPlan", Icon: IconListChecks, soon: true },
  ]),
];

const PARENT_GROUPS: NavGroup[] = [
  PARENT_AI_GROUP,
  {
    id: "my-student",
    labelKey: "nav.group.myStudent",
    Icon: IconUsers,
    items: [
      { id: "progress-report", to: "/students", labelKey: "nav.progressReport", Icon: IconReportAnalytics, exactRole: "parent" },
      { id: "absence", to: "/students/attendance", labelKey: "nav.absence", Icon: IconClipboardCheck, exactRole: "parent", module: "attendance" },
      { id: "child-exam-results", to: "/students/exams", labelKey: "nav.childExamResults", Icon: IconExam, exactRole: "parent", module: "marks" },
      { id: "child-study-plan", to: "/students/study", labelKey: "nav.childStudyPlan", Icon: IconListChecks, exactRole: "parent", module: "pomodoro" },
    ],
  },
  {
    id: "institution",
    labelKey: "nav.group.institution",
    Icon: IconUserCog,
    items: [
      { id: "payment-statement", to: "/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, exactRole: "parent", module: "payments" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointmentsAndCommunication", Icon: IconHandshake, exactRole: "parent", module: "appointments" },
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage, module: "messages" },
      { id: "calendar", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarStar, module: "events" },
      { id: "meals", to: "/meals", labelKey: "nav.meals", Icon: IconUtensils, module: "meals" },
      settingsAction("settings-parent"),
    ],
  },
];

const GROUPS_BY_ROLE: Record<Role, NavGroup[]> = {
  student: STUDENT_GROUPS,
  teacher: TEACHER_GROUPS,
  manager: ADMIN_GROUPS,
  admin: ADMIN_GROUPS,
  parent: PARENT_GROUPS,
};

// The mobile bottom tab bar: Home plus two of the role's busiest pages, then
// the bar's own Search and Menu buttons. Entries are picked by id from the
// role's sidebar tree, so a tab always carries the same icon and label as its
// sidebar row.
const PRIMARY_IDS_BY_ROLE: Record<Role, string[]> = {
  student: ["my-homework", "exam-results"],
  teacher: ["my-classes", "student-attendance"],
  manager: ["students-roster", "class-groups"],
  admin: ["students-roster", "class-groups"],
  parent: ["progress-report", "appointments"],
};

function primaryItemsFor(role: Role): NavItem[] {
  const all = GROUPS_BY_ROLE[role].flatMap((group) => group.items);
  const picked = PRIMARY_IDS_BY_ROLE[role]
    .map((id) => all.find((item) => item.id === id))
    .filter((item): item is NavItem => item !== undefined);
  return [HOME_ITEM, ...picked];
}

function itemVisible(item: NavItem, role: Role | undefined) {
  if (!role) return false;
  if (item.exactRole) return hasExactRole(role, item.exactRole);
  if (item.minRole || item.maxRole) return roleInRange(role, item.minRole, item.maxRole);
  return true;
}

/**
 * The school's entitlement gate. Null/undefined means "unknown" (still
 * loading, logged out, or the lookup failed) and shows everything — a modules
 * outage must never blank the shell; the backend still 403s the nest itself.
 */
export function moduleVisible(item: NavItem, enabled: readonly string[] | null | undefined): boolean {
  if (enabled == null) return true;
  if (item.module == null) return true;
  return enabled.includes(item.module);
}

export function primaryNavItems(role: Role | undefined, enabled?: readonly string[] | null): NavItem[] {
  if (!role) return [];
  return primaryItemsFor(role).filter((item) => itemVisible(item, role) && moduleVisible(item, enabled));
}

/** The full, role-specific group tree — desktop sidebar and the mobile menu
 *  sheet both render this directly; it mirrors the Figma sidebar as-is, with
 *  no items pulled out for a separate "primary" section. */
export function visibleNavGroups(role: Role | undefined, enabled?: readonly string[] | null): NavGroup[] {
  if (!role) return [];
  return GROUPS_BY_ROLE[role]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemVisible(item, role) && moduleVisible(item, enabled)),
    }))
    .filter((group) => group.items.length > 0);
}

export function visibleNavItems(role: Role | undefined, enabled?: readonly string[] | null): NavItem[] {
  const items = [HOME_ITEM, ...primaryNavItems(role, enabled), ...visibleNavGroups(role, enabled).flatMap((group) => group.items)];
  return items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id && candidate.to === item.to) === index);
}

export function pathActive(pathname: string, to: string, exact?: boolean) {
  if (!to) return false;
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function primaryPathActive(pathname: string, item: NavItem) {
  return pathActive(pathname, item.to, item.exact);
}

function searchMatches(item: NavItem, search: Record<string, unknown> | undefined) {
  if (!item.search) return true;
  return Object.entries(item.search).every(([key, value]) => search?.[key] === value);
}

export function routeNavItem(pathname: string, role: Role | undefined, search?: Record<string, unknown>): NavItem | undefined {
  return [...primaryNavItems(role), ...visibleNavItems(role)]
    .filter((item) => pathActive(pathname, item.to, item.exact) && searchMatches(item, search))
    .sort((a, b) => b.to.length - a.to.length || Number(!!b.search) - Number(!!a.search))[0];
}

// Routes that are reachable but carry no sidebar entry — the account menu, a
// course-kind view, a deep link. Without these the shell's title falls back to
// the raw pathname and the header reads "/profile/me".
const UNLISTED_ROUTE_LABELS: { prefix: string; labelKey: MessageKey }[] = [
  // Longest prefix first — /profile/me is the viewer's own, every other
  // /profile/{id} belongs to somebody else and must not read "My profile".
  { prefix: "/profile/me", labelKey: "profile.myProfile" },
  { prefix: "/profile", labelKey: "profile.title" },
  { prefix: "/guide", labelKey: "nav.guide" },
  { prefix: "/attendance", labelKey: "nav.attendance" },
  { prefix: "/studies", labelKey: "courses.kind.study" },
  { prefix: "/clubs", labelKey: "courses.kind.club" },
  { prefix: "/courses", labelKey: "nav.classes" },
  { prefix: "/notes", labelKey: "nav.notes" },
  { prefix: "/questions", labelKey: "nav.questions" },
  { prefix: "/events", labelKey: "nav.events" },
  { prefix: "/meals", labelKey: "nav.meals" },
];

/**
 * The label the shell header shows for a route: its nav entry when it has one,
 * otherwise an explicit fallback. Returns undefined only for routes rendered
 * without the shell (login, register, the exam room).
 */
export function routeLabelKey(pathname: string, role: Role | undefined): MessageKey | undefined {
  const item = routeNavItem(pathname, role);
  if (item) return item.labelKey;

  const unlisted = UNLISTED_ROUTE_LABELS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (unlisted) return unlisted.labelKey;

  // A page still has a name when the viewer may not open it — the shell title
  // must not go blank on the "no access" screen — so fall back to the nav entry
  // for any role, not just this one.
  const allItems = [HOME_ITEM, ...Object.values(GROUPS_BY_ROLE).flatMap((groups) => groups.flatMap((group) => group.items))];
  return allItems
    .filter((entry) => pathActive(pathname, entry.to, entry.exact))
    .sort((a, b) => b.to.length - a.to.length)[0]?.labelKey;
}
