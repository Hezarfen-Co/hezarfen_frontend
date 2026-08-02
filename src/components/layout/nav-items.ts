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
};

const MEALS_ITEM: NavItem = {
  id: "meals",
  to: "/meals",
  labelKey: "nav.meals",
  Icon: IconUtensils,
};

const PRIMARY_BY_ROLE: Record<Role, NavItem[]> = {
  student: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM, PROGRESS_ITEM],
  teacher: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  manager: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  admin: [HOME_ITEM, CLASSES_ITEM, CALENDAR_ITEM],
  parent: [HOME_ITEM, CHILDREN_ITEM, CALENDAR_ITEM, MEALS_ITEM],
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "classes",
    labelKey: "nav.group.classes",
    Icon: IconGuide,
    items: [
      CLASSES_ITEM,
      { id: "homework", to: "/homework", labelKey: "nav.homework", Icon: IconHomework },
      { id: "exams", to: "/exams", labelKey: "nav.exams", Icon: IconExam },
      { id: "question-bank", to: "/question-bank", labelKey: "nav.questionBank", Icon: IconArchive, minRole: "teacher" },
      { id: "marks", to: "/marks", labelKey: "nav.marks", Icon: IconChart, exactRole: "student" },
    ],
  },
  {
    id: "planning",
    labelKey: "nav.group.planning",
    Icon: IconCalendarDays,
    items: [
      { id: "events", to: "/events", labelKey: "nav.events", Icon: IconCalendar },
      CALENDAR_ITEM,
      { id: "appointments", to: "/appointments", labelKey: "nav.appointments", Icon: IconClock },
    ],
  },
  {
    id: "workspace",
    labelKey: "nav.group.workspace",
    Icon: IconNote,
    items: [
      { id: "notes", to: "/notes", labelKey: "nav.notes", Icon: IconNote },
      { id: "whiteboards", to: "/whiteboards", labelKey: "nav.whiteboards", Icon: IconEdit, minRole: "student" },
      { id: "pomodoro", to: "/pomodoro", labelKey: "nav.pomodoro", Icon: IconClock, exactRole: "student" },
    ],
  },
  {
    id: "students",
    labelKey: "nav.group.students",
    Icon: IconReportAnalytics,
    items: [
      CHILDREN_ITEM,
      { id: "student-marks", to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher" },
      { id: "student-attendance", to: "/management/student-attendance", labelKey: "nav.studentAttendance", Icon: IconClipboardCheck, minRole: "teacher" },
      { id: "student-pomodoro", to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconClock, minRole: "teacher" },
    ],
  },
  {
    id: "community",
    labelKey: "nav.group.community",
    Icon: IconGlobe,
    items: [
      MEALS_ITEM,
      { id: "payment-statement", to: "/payments", labelKey: "nav.paymentStatement", Icon: IconChart, maxRole: "student" },
      { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage },
      { id: "questions", to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle },
      { id: "work", to: "/work", labelKey: "nav.work", Icon: IconBriefcase, minRole: "teacher", maxRole: "manager" },
    ],
  },
  {
    id: "school",
    labelKey: "nav.group.school",
    Icon: IconGrid,
    items: [
      { id: "staff-work", to: "/management/staff-work", labelKey: "nav.staffWork", Icon: IconBriefcase, minRole: "manager" },
      { id: "settings", to: "/management/settings", labelKey: "nav.settings", Icon: IconSettings, minRole: "manager" },
      { id: "terms", to: "/management/terms", labelKey: "nav.terms", Icon: IconCalendarDays, minRole: "manager" },
      { id: "payments", to: "/management/payments", labelKey: "nav.payments", Icon: IconReportAnalytics, minRole: "manager" },
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

export function primaryNavItems(role: Role | undefined): NavItem[] {
  return role ? PRIMARY_BY_ROLE[role] : [];
}

export function visibleNavGroups(role: Role | undefined): NavGroup[] {
  return NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => itemVisible(item, role)) }))
    .filter((group) => group.items.length > 0);
}

export function sidebarNavGroups(role: Role | undefined): NavGroup[] {
  const primaryPaths = new Set(primaryNavItems(role).map((item) => item.to));
  return visibleNavGroups(role)
    .map((group) => ({ ...group, items: group.items.filter((item) => !primaryPaths.has(item.to)) }))
    .filter((group) => group.items.length > 0);
}

export function visibleNavItems(role: Role | undefined): NavItem[] {
  const items = [HOME_ITEM, ...visibleNavGroups(role).flatMap((group) => group.items)];
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
