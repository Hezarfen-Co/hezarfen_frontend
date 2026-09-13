import type { Component } from "solid-js";
import type { Role } from "@/api/client";
import {
  IconArchive,
  IconBook,
  IconBotSquare,
  IconBriefcase,
  IconCalendar,
  IconCalendarDays,
  IconChalkboardTeacher,
  IconChart,
  IconChartPie,
  IconClipboardCheck,
  IconClock,
  IconEdit,
  IconExam,
  IconHelpCircle,
  IconHomework,
  IconHome,
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
};

export const HOME_ITEM: NavItem = {
  id: "today",
  to: "/",
  labelKey: "nav.today",
  Icon: IconHome,
  exact: true,
};

const CELEBI_ITEM: NavItem = {
  id: "celebi",
  to: "",
  labelKey: "nav.celebi",
  Icon: IconSparkles,
  action: "celebi",
};

const SOUND_STUDIO_ITEM: NavItem = {
  id: "sound-studio",
  to: "/coming-soon/ses-atolyesi",
  labelKey: "nav.soundStudio",
  Icon: IconWaveform,
  soon: true,
};

function settingsAction(id: string): NavItem {
  return { id, to: "", labelKey: "nav.settings", Icon: IconSettings, action: "profile" };
}

// Admin and manager share one Figma information architecture (Operasyon /
// Yapay zekâ / Kurum) — manager just qualifies for fewer of its items, via
// the same minRole gates the rest of this file already uses.
const ADMIN_GROUPS: NavGroup[] = [
  {
    id: "operations",
    labelKey: "nav.group.operations",
    Icon: IconSchool,
    items: [
      { id: "students-roster", to: "/management/students", labelKey: "nav.studentsRoster", Icon: IconUsers, minRole: "manager" },
      { id: "teachers-roster", to: "/management/teachers", labelKey: "nav.teachersRoster", Icon: IconChalkboardTeacher, minRole: "manager" },
      { id: "class-groups", to: "/management/classes", labelKey: "nav.classGroups", Icon: IconSchool, minRole: "teacher" },
      { id: "courses", to: "/courses", labelKey: "nav.courses", Icon: IconBook, module: "courses" },
      { id: "terms", to: "/management/terms", labelKey: "nav.terms", Icon: IconCalendar, minRole: "manager" },
      { id: "schedule", to: "/calendar", labelKey: "nav.schedule", Icon: IconCalendarDays, minRole: "manager" },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarDays, module: "events" },
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.attendance", Icon: IconClipboardCheck, minRole: "teacher", module: "attendance" },
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher", module: "marks" },
      { id: "student-pomodoros", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconClock, minRole: "teacher", module: "pomodoro" },
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework, module: "homework" },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, minRole: "teacher", module: "exams" },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, minRole: "teacher", module: "bank_questions" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconClock, module: "appointments" },
      { id: "mock-exams", to: "/coming-soon/deneme-sinavlari", labelKey: "nav.mockExams", Icon: IconTarget, soon: true, minRole: "manager" },
      { id: "optical-reading", to: "/coming-soon/optik-okuma", labelKey: "nav.opticalReading", Icon: IconScan, soon: true, minRole: "manager" },
      { id: "payments-collection", to: "/management/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, minRole: "manager", module: "payments" },
    ],
  },
  {
    id: "ai",
    labelKey: "nav.group.ai",
    Icon: IconSparkles,
    items: [
      { id: "hezarfen-zeka", to: "/coming-soon/hezarfen-zeka", labelKey: "nav.hezarfenZeka", Icon: IconBotSquare, soon: true, minRole: "manager" },
      CELEBI_ITEM,
      SOUND_STUDIO_ITEM,
    ],
  },
  {
    id: "institution",
    labelKey: "nav.group.institution",
    Icon: IconUserCog,
    items: [
      { id: "reports", to: "/coming-soon/raporlar", labelKey: "nav.reports", Icon: IconChartPie, soon: true, minRole: "manager" },
      { id: "license-modules", to: "/management/modules", labelKey: "nav.licenseModules", Icon: IconPackage, minRole: "admin" },
      { id: "users", to: "/admin/users", labelKey: "nav.users", Icon: IconUserCog, minRole: "admin" },
      { id: "data-protection", to: "/coming-soon/kvkk-denetim", labelKey: "nav.dataProtection", Icon: IconShieldCheck, soon: true, minRole: "admin" },
      { id: "school-meals", to: "/meals", labelKey: "nav.schoolMeals", Icon: IconUtensils, minRole: "manager", module: "meals" },
      { id: "staff-work", to: "/management/staff-work", labelKey: "nav.staffWork", Icon: IconBriefcase, minRole: "manager", module: "work" },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconClock, minRole: "teacher", module: "work" },
      { id: "settings", to: "/management/settings", labelKey: "nav.settings", Icon: IconSettings, minRole: "manager" },
    ],
  },
];

const TEACHER_GROUPS: NavGroup[] = [
  {
    id: "my-classroom",
    labelKey: "nav.group.myClassroom",
    Icon: IconSchool,
    items: [
      { id: "my-classes", to: "/management/classes", labelKey: "nav.myClasses", Icon: IconSchool },
      { id: "my-schedule", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "courses", to: "/courses", labelKey: "nav.courses", Icon: IconBook, module: "courses" },
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.attendance", Icon: IconClipboardCheck, module: "attendance" },
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, module: "marks" },
      { id: "student-pomodoros", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconClock, module: "pomodoro" },
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework, module: "homework" },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, module: "exams" },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, module: "bank_questions" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
    ],
  },
  {
    id: "ai",
    labelKey: "nav.group.ai",
    Icon: IconSparkles,
    items: [
      { id: "student-analysis", to: "/coming-soon/ogrenci-analizi", labelKey: "nav.studentAnalysis", Icon: IconChart, soon: true },
      { id: "pending-approvals", to: "/coming-soon/bekleyen-onaylar", labelKey: "nav.pendingApprovals", Icon: IconHelpCircle, soon: true },
      { id: "question-generation", to: "/coming-soon/soru-uretimi", labelKey: "nav.questionGeneration", Icon: IconEdit, soon: true },
      SOUND_STUDIO_ITEM,
    ],
  },
  {
    id: "other",
    labelKey: "nav.group.other",
    Icon: IconMessage,
    items: [
      { id: "parent-communication", to: "/messages", labelKey: "nav.parentCommunication", Icon: IconMessage, module: "messages" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconClock, module: "appointments" },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarDays, module: "events" },
      { id: "meals", to: "/meals", labelKey: "nav.meals", Icon: IconUtensils, module: "meals" },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconBriefcase, minRole: "teacher", module: "work" },
      settingsAction("settings-teacher"),
    ],
  },
];

const STUDENT_GROUPS: NavGroup[] = [
  {
    id: "study",
    labelKey: "nav.group.study",
    Icon: IconSchool,
    items: [
      { id: "study-plan", to: "/coming-soon/calisma-programim", labelKey: "nav.studyPlan", Icon: IconClock, soon: true },
      { id: "topic-mastery", to: "/marks", labelKey: "nav.topicMastery", Icon: IconChart, exactRole: "student", module: "marks" },
      { id: "exam-results", to: "/exams", labelKey: "nav.examResults", Icon: IconExam, module: "exams" },
      { id: "my-homework", to: "/homework", labelKey: "nav.myHomework", Icon: IconHomework, module: "homework" },
      { id: "courses", to: "/courses", labelKey: "nav.courses", Icon: IconBook, module: "courses" },
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, module: "boards" },
      { id: "pomodoro", to: "/pomodoro", labelKey: "nav.pomodoro", Icon: IconClock, exactRole: "student", module: "pomodoro" },
    ],
  },
  {
    id: "ai",
    labelKey: "nav.group.ai",
    Icon: IconSparkles,
    items: [CELEBI_ITEM, SOUND_STUDIO_ITEM],
  },
  {
    id: "other",
    labelKey: "nav.group.other",
    Icon: IconCalendarDays,
    items: [
      { id: "calendar", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarDays, module: "events" },
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage, module: "messages" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconClock, module: "appointments" },
      { id: "meals", to: "/meals", labelKey: "nav.meals", Icon: IconUtensils, module: "meals" },
      settingsAction("settings-student"),
    ],
  },
];

const PARENT_GROUPS: NavGroup[] = [
  {
    id: "my-student",
    labelKey: "nav.group.myStudent",
    Icon: IconUsers,
    items: [
      { id: "progress-report", to: "/students", labelKey: "nav.progressReport", Icon: IconReportAnalytics, exactRole: "parent" },
      { id: "absence", to: "/students/attendance", labelKey: "nav.absence", Icon: IconClipboardCheck, exactRole: "parent", module: "attendance" },
      { id: "child-exam-results", to: "/students/exams", labelKey: "nav.childExamResults", Icon: IconExam, exactRole: "parent", module: "marks" },
      { id: "child-study-plan", to: "/students/study", labelKey: "nav.childStudyPlan", Icon: IconClock, exactRole: "parent", module: "pomodoro" },
    ],
  },
  {
    id: "institution",
    labelKey: "nav.group.institution",
    Icon: IconUserCog,
    items: [
      { id: "payment-statement", to: "/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, exactRole: "parent", module: "payments" },
      { id: "appointments", to: "/appointments", labelKey: "nav.appointmentsAndCommunication", Icon: IconClock, exactRole: "parent", module: "appointments" },
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage, module: "messages" },
      { id: "calendar", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays },
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendarDays, module: "events" },
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

// The mobile bottom tab bar keeps its own small, role-specific set — Figma's
// desktop sidebar has no equivalent "primary strip" (only "Ana Sayfa" sits
// outside the groups there), so this stays a phone-only affordance built
// from items that also exist in the role's group tree above.
const PRIMARY_BY_ROLE: Record<Role, NavItem[]> = {
  student: [HOME_ITEM, { id: "exam-results", to: "/exams", labelKey: "nav.examResults", Icon: IconExam, module: "exams" }, { id: "topic-mastery", to: "/marks", labelKey: "nav.topicMastery", Icon: IconChart, exactRole: "student", module: "marks" }],
  teacher: [HOME_ITEM, { id: "my-classes", to: "/management/classes", labelKey: "nav.myClasses", Icon: IconSchool }, { id: "my-schedule", to: "/calendar", labelKey: "nav.mySchedule", Icon: IconCalendarDays }],
  manager: [HOME_ITEM, { id: "class-groups", to: "/management/classes", labelKey: "nav.classGroups", Icon: IconSchool, minRole: "teacher" }, { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, minRole: "teacher", module: "exams" }],
  admin: [HOME_ITEM, { id: "class-groups", to: "/management/classes", labelKey: "nav.classGroups", Icon: IconSchool, minRole: "teacher" }, { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, minRole: "teacher", module: "exams" }],
  parent: [HOME_ITEM, { id: "progress-report", to: "/students", labelKey: "nav.progressReport", Icon: IconReportAnalytics, exactRole: "parent" }, { id: "appointments", to: "/appointments", labelKey: "nav.appointmentsAndCommunication", Icon: IconClock, exactRole: "parent", module: "appointments" }],
};

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
  return PRIMARY_BY_ROLE[role].filter((item) => moduleVisible(item, enabled));
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

export function routeNavItem(pathname: string, role: Role | undefined): NavItem | undefined {
  return [...primaryNavItems(role), ...visibleNavItems(role)]
    .filter((item) => pathActive(pathname, item.to, item.exact))
    .sort((a, b) => b.to.length - a.to.length)[0];
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
  { prefix: "/courses", labelKey: "nav.courses" },
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
