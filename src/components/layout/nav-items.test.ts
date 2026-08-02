import { pathActive, primaryNavItems, primaryPathActive, routeNavItem, sidebarNavGroups, visibleNavItems } from "@/components/layout/nav-items";

test.each([
  ["student", ["/", "/courses", "/calendar", "/marks"]],
  ["teacher", ["/", "/courses", "/calendar"]],
  ["manager", ["/", "/courses", "/calendar"]],
  ["admin", ["/", "/courses", "/calendar"]],
  ["parent", ["/", "/students", "/calendar", "/meals"]],
] as const)("%s gets role-specific primary destinations", (role, expected) => {
  expect(primaryNavItems(role).map((item) => item.to)).toEqual(expected);
});

test("invalid role destinations stay hidden", () => {
  expect(visibleNavItems("student").map((item) => item.to)).not.toContain("/school");
  expect(visibleNavItems("parent").map((item) => item.to)).not.toContain("/courses");
  expect(visibleNavItems("teacher").map((item) => item.to)).not.toContain("/admin/users");
});

test("student secondary navigation follows the academic, planning, workspace, community flow", () => {
  expect(
    sidebarNavGroups("student").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "classes", items: ["homework", "exams"] },
    { id: "planning", items: ["events", "appointments"] },
    { id: "workspace", items: ["notes", "whiteboards", "pomodoro"] },
    { id: "community", items: ["meals", "payment-statement", "messages", "questions"] },
  ]);
});

test.each(["student", "parent", "teacher", "manager", "admin"] as const)(
  "%s can reach every visible feature and appointments from the sidebar",
  (role) => {
    const paths = [
      ...primaryNavItems(role).map((item) => item.to),
      ...sidebarNavGroups(role).flatMap((group) => group.items.map((item) => item.to)),
    ];
    expect(new Set(paths)).toEqual(new Set(visibleNavItems(role).map((item) => item.to)));
    expect(paths).toContain("/appointments");
  },
);

test("nested entity routes keep their primary destination active", () => {
  expect(pathActive("/courses/course-1", "/courses")).toBe(true);
  expect(routeNavItem("/courses/course-1", "teacher")?.id).toBe("classes");
  expect(routeNavItem("/management/student-attendance", "teacher")?.id).toBe("student-attendance");
  expect(primaryPathActive("/exams/exam-1", primaryNavItems("student")[1]!)).toBe(true);
});

test.each([
  ["/homework", "student", "homework"],
  ["/events/event-1", "teacher", "events"],
  ["/management/student-attendance", "teacher", "student-attendance"],
  ["/management/settings", "manager", "settings"],
] as const)("sidebar resolves one active item for %s", (pathname, role, expected) => {
  const items = [
    ...primaryNavItems(role),
    ...sidebarNavGroups(role).flatMap((group) => group.items),
  ];
  const current = routeNavItem(pathname, role);

  expect(items.filter((item) => item.id === current?.id).map((item) => item.id)).toEqual([expected]);
});
