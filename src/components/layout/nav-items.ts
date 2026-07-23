import type { Component } from "solid-js";
import type { Role } from "@/api/client";
import {
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCalendarDays,
  IconChart,
  IconClock,
  IconClipboardCheck,
  IconExam,
  IconGlobe,
  IconHelpCircle,
  IconHomework,
  IconHome,
  IconMessage,
  IconNote,
  IconReportAnalytics,
  IconSchool,
  IconSettings,
  IconUserCog,
  IconUsers,
} from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { hasExactRole, hasMinRole, roleInRange } from "@/lib/roles";

export type NavItem = {
  to: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  minRole?: Role;
  /** Inclusive upper bound (e.g. hide from admin with maxRole: "manager"). */
  maxRole?: Role;
  /** When set, only this exact role sees the item. */
  exactRole?: Role;
  exact?: boolean;
};

export type NavGroup = {
  id: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  minRole?: Role;
  exactRole?: Role;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "classes",
    labelKey: "nav.group.classes",
    Icon: IconSchool,
    items: [
      { to: "/courses", labelKey: "nav.courses", Icon: IconBook },
      { to: "/studies", labelKey: "nav.studies", Icon: IconClock },
      { to: "/clubs", labelKey: "nav.clubs", Icon: IconUsers },
      { to: "/homework", labelKey: "nav.homework", Icon: IconHomework },
      { to: "/exams", labelKey: "nav.exams", Icon: IconExam },
      { to: "/events", labelKey: "nav.events", Icon: IconCalendar },
      { to: "/calendar", labelKey: "nav.calendar", Icon: IconCalendarDays },
      { to: "/marks", labelKey: "nav.marks", Icon: IconChart, exactRole: "student" },
      { to: "/attendance", labelKey: "nav.attendance", Icon: IconClipboardCheck, exactRole: "student" },
      { to: "/pomodoro", labelKey: "nav.pomodoro", Icon: IconClock, exactRole: "student" },
    ],
  },
  {
    id: "students",
    labelKey: "nav.group.students",
    Icon: IconUsers,
    exactRole: "parent",
    items: [
      { to: "/students", labelKey: "nav.myStudents", Icon: IconUsers, exactRole: "parent" },
    ],
  },
  {
    id: "grades",
    labelKey: "nav.group.grades",
    Icon: IconNote,
    items: [
      { to: "/notes", labelKey: "nav.notes", Icon: IconNote },
    ],
  },
  {
    id: "community",
    labelKey: "nav.group.community",
    Icon: IconGlobe,
    items: [
      { to: "/messages", labelKey: "nav.messages", Icon: IconMessage },
      { to: "/questions", labelKey: "nav.questions", Icon: IconHelpCircle },
    ],
  },
  {
    id: "reports",
    labelKey: "nav.group.reports",
    Icon: IconReportAnalytics,
    minRole: "teacher",
    items: [
      { to: "/management/student-marks", labelKey: "nav.studentMarks", Icon: IconChart, minRole: "teacher" },
      { to: "/management/student-attendance", labelKey: "nav.studentAttendance", Icon: IconClipboardCheck, minRole: "teacher" },
      { to: "/management/pomodoros", labelKey: "nav.studentPomodoro", Icon: IconClock, minRole: "teacher" },
      { to: "/work", labelKey: "nav.work", Icon: IconBriefcase, minRole: "teacher", maxRole: "manager" },
      { to: "/management/staff-work", labelKey: "nav.staffWork", Icon: IconBriefcase, minRole: "manager" },
    ],
  },
  {
    id: "settings",
    labelKey: "nav.group.settings",
    Icon: IconSettings,
    minRole: "manager",
    items: [
      { to: "/management/settings", labelKey: "nav.settings", Icon: IconSettings, minRole: "manager" },
      { to: "/management/terms", labelKey: "nav.terms", Icon: IconCalendarDays, minRole: "manager" },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.admin",
    Icon: IconUserCog,
    minRole: "admin",
    items: [
      { to: "/admin/users", labelKey: "nav.users", Icon: IconUsers, minRole: "admin" },
    ],
  },
];

export const HOME_ITEM: NavItem = {
  to: "/",
  labelKey: "nav.home",
  Icon: IconHome,
  exact: true,
};

const PARENT_GROUP: NavGroup = {
  id: "students",
  labelKey: "nav.group.students",
  Icon: IconUsers,
  exactRole: "parent",
  items: [
    { to: "/students", labelKey: "nav.myStudents", Icon: IconUsers, exactRole: "parent" },
    { to: "/messages", labelKey: "nav.messages", Icon: IconMessage, exactRole: "parent" },
  ],
};

function itemVisible(item: NavItem, role: Role | undefined) {
  if (role === "parent") return item.to === "/students" || item.to === "/messages";
  if (item.exactRole) return hasExactRole(role, item.exactRole);
  if (item.minRole || item.maxRole) return roleInRange(role, item.minRole, item.maxRole);
  return true;
}

export function visibleNavGroups(role: Role | undefined): NavGroup[] {
  if (role === "parent") return [PARENT_GROUP];
  return NAV_GROUPS
    .filter((group) => {
      if (group.exactRole && !hasExactRole(role, group.exactRole)) return false;
      if (group.minRole && !hasMinRole(role, group.minRole)) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemVisible(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function pathActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}
