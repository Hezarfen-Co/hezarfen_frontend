import type { Component } from "solid-js";
import type { Role } from "@/api/client";
import {
  IconArchive,
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCalendarDays,
  IconChart,
  IconClock,
  IconClipboardCheck,
  IconExam,
  IconGlobe,
  IconGrid,
  IconGuide,
  IconHelpCircle,
  IconHomework,
  IconHome,
  IconMessage,
  IconEdit,
  IconNote,
  IconReportAnalytics,
  IconSchool,
  IconSettings,
  IconUserCog,
  IconUsers,
  IconUtensils,
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

const CLASSES_ITEM: NavItem = {
  id: "classes",
  to: "/courses",
  labelKey: "nav.classes",
  Icon: IconBook,
  module: "courses",
};

const CALENDAR_ITEM: NavItem = {
  id: "calendar",
  to: "/calendar",
  labelKey: "nav.calendar",
  Icon: IconCalendarDays,
};

const CHILDREN_ITEM: NavItem = {
  id: "children",
  to: "/students",
  labelKey: "nav.children",
  Icon: IconUsers,
  exactRole: "parent",
};

const PROGRESS_ITEM: NavItem = {
  id: "progress",
  to: "/marks",
  labelKey: "nav.marks",
  Icon: IconChart,
  exactRole: "student",
  module: "marks",
};

const MEALS_ITEM: NavItem = {
  id: "meals",
  to: "/meals",
  labelKey: "nav.meals",
  Icon: IconUtensils,
  module: "meals",
};

const PRIMARY_BY_ROLE: Record<Role, NavItem[]> = {
  student: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM, PROGRESS_ITEM],
  teacher: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  manager: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  admin: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  // Meals stays out of the primary strip so it lives under "Community" for
  // every role consistently, same as teacher/manager/admin/student.
  parent: [HOME_ITEM, CHILDREN_ITEM, CALENDAR_ITEM],
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "classes",
    labelKey: "nav.group.classes",
    Icon: IconSchool,
    items: [
      CLASSES_ITEM,
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework, module: "homework" },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam, module: "exams" },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, minRole: "teacher", module: "bank_questions" },
      { id: "marks", to: "/marks", labelKey: "nav.marks", Icon: IconChart, exactRole: "student", module: "marks" },
    ],
  },
  {
    id: "planning",
    labelKey: "nav.group.planning",
    Icon: IconCalendarDays,
    items: [
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendar, module: "events" },
      CALENDAR_ITEM,
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconClock, module: "appointments" },
    ],
  },
  {
    id: "workspace",
    labelKey: "nav.group.workspace",
    Icon: IconNote,
    items: [
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote, module: "notes" },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, minRole: "student", module: "boards" },
      { id: "pomodoro", to: "/pomodoro", labelKey: "nav.pomodoro", Icon: IconClock, exactRole: "student", module: "pomodoro" },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconBriefcase, minRole: "teacher", maxRole: "manager", module: "work" },
    ],
  },
  {
    id: "students",
    labelKey: "nav.group.students",
    Icon: IconReportAnalytics,
    items: [
      CHILDREN_ITEM,
      { id: "class-groups", to: "/management/classes", labelKey: "nav.classGroups", Icon: IconUsers, minRole: "teacher", module: "classes" },
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher", module: "marks" },
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.studentAttendance", Icon: IconClipboardCheck, minRole: "teacher", module: "attendance" },
      { id: "student-pomodoro", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconClock, minRole: "teacher", module: "pomodoro" },
    ],
  },
  {
    id: "services",
    labelKey: "nav.group.services",
    Icon: IconGuide,
    items: [
      MEALS_ITEM,
      { id: "payment-statement", to: "/payments", labelKey: "nav.paymentStatement", Icon: IconChart, maxRole: "student", module: "payments" },
    ],
  },
  {
    id: "community",
    labelKey: "nav.group.community",
    Icon: IconGlobe,
    items: [
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage, module: "messages" },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle, module: "questions" },
    ],
  },
  {
    id: "school",
    labelKey: "nav.group.school",
    Icon: IconGrid,
    items: [
      { id: "staff-work", to: "/management/staff-work", labelKey: "nav.staffWork", Icon: IconBriefcase, minRole: "manager", module: "work" },
      { id: "settings", to: "/management/settings", labelKey: "nav.settings", Icon: IconSettings, minRole: "manager" },
      { id: "terms", to: "/management/terms", labelKey: "nav.terms", Icon: IconCalendarDays, minRole: "manager" },
      { id: "payments", to: "/management/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, minRole: "manager", module: "payments" },
      { id: "users", to: "/admin/users", labelKey: "nav.users", Icon: IconUserCog, minRole: "admin" },
    ],
  },
];

function itemVisible(item: NavItem, role: Role | undefined) {
  if (!role) return false;
  if (item.exactRole) return hasExactRole(role, item.exactRole);
  if (item.minRole || item.maxRole) return roleInRange(role, item.minRole, item.maxRole);
  return role !== "parent" || ["/", "/calendar", "/appointments", "/meals", "/messages"].includes(item.to);
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

export function visibleNavGroups(role: Role | undefined, enabled?: readonly string[] | null): NavGroup[] {
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemVisible(item, role) && moduleVisible(item, enabled)),
    }))
    .filter((group) => group.items.length > 0);
}

export function sidebarNavGroups(role: Role | undefined, enabled?: readonly string[] | null): NavGroup[] {
  const primaryPaths = new Set(primaryNavItems(role, enabled).map((item) => item.to));
  return visibleNavGroups(role, enabled)
    .map((group) => ({ ...group, items: group.items.filter((item) => !primaryPaths.has(item.to)) }))
    .filter((group) => group.items.length > 0);
}

export function visibleNavItems(role: Role | undefined, enabled?: readonly string[] | null): NavItem[] {
  const items = [HOME_ITEM, ...visibleNavGroups(role, enabled).flatMap((group) => group.items)];
  return items.filter((item, index) => items.findIndex((candidate) => candidate.to === item.to) === index);
}

export function pathActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function primaryPathActive(pathname: string, item: NavItem) {
  if (pathActive(pathname, item.to, item.exact)) return true;
  const prefixes: Partial<Record<string, string[]>> = {
    classes: ["/homework", "/exams", "/question-bank"],
    calendar: ["/events", "/appointments"],
    progress: ["/attendance", "/pomodoro"],
  };
  return (prefixes[item.id] ?? []).some((prefix) => pathname.startsWith(prefix));
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
  return [HOME_ITEM, ...NAV_GROUPS.flatMap((group) => group.items)]
    .filter((entry) => pathActive(pathname, entry.to, entry.exact))
    .sort((a, b) => b.to.length - a.to.length)[0]?.labelKey;
}
