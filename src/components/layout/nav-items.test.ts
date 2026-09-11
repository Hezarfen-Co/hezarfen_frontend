import { moduleVisible, pathActive, primaryNavItems, primaryPathActive, routeLabelKey, routeNavItem, sidebarNavGroups, visibleNavItems } from "@/components/layout/nav-items";

test.each([
  ["student", ["/", "/courses", "/calendar", "/marks"]],
  ["teacher", ["/", "/courses", "/calendar"]],
  ["manager", ["/", "/courses", "/calendar"]],
  ["admin", ["/", "/courses", "/calendar"]],
  ["parent", ["/", "/students", "/calendar"]],
] as const)("%s gets role-specific primary destinations", (role, expected) => {
  expect(primaryNavItems(role).map((item) => item.to)).toEqual(expected);
});

test("invalid role destinations stay hidden", () => {
  expect(visibleNavItems("student").map((item) => item.to)).not.toContain("/school");
  expect(visibleNavItems("parent").map((item) => item.to)).not.toContain("/courses");
  expect(visibleNavItems("teacher").map((item) => item.to)).not.toContain("/admin/users");
});

test("student secondary navigation follows the academic, planning, workspace, services, community flow", () => {
  expect(
    sidebarNavGroups("student").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "classes", items: ["homework", "exams"] },
    { id: "planning", items: ["events", "appointments"] },
    { id: "workspace", items: ["notes", "whiteboards", "pomodoro"] },
    { id: "services", items: ["meals", "payment-statement"] },
    { id: "community", items: ["messages", "questions"] },
  ]);
});

test("parent's services group includes meals and payment-statement, consistent with every other role", () => {
  const services = sidebarNavGroups("parent").find((group) => group.id === "services");
  expect(services?.items.map((item) => item.id)).toEqual(["meals", "payment-statement"]);
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

// The shell header used to print the raw pathname for any route without a
// sidebar entry, so /profile/me read as "/profile/me".
test.each([
  ["/profile/me", "profile.myProfile"],
  ["/profile/u-1", "profile.title"],
  ["/guide", "nav.guide"],
  ["/attendance", "nav.attendance"],
  ["/studies", "courses.kind.study"],
  ["/clubs", "courses.kind.club"],
] as const)("%s has a header label", (pathname, expected) => {
  expect(routeLabelKey(pathname, "student")).toBe(expected);
});

test("routes with a sidebar entry still take their nav label", () => {
  expect(routeLabelKey("/courses/course-1", "teacher")).toBe(routeNavItem("/courses/course-1", "teacher")?.labelKey);
});

test("a route rendered outside the shell has no label rather than a raw path", () => {
  expect(routeLabelKey("/login", undefined)).toBeUndefined();
});

test("a page keeps its name for a viewer who may not open it", () => {
  // /students is parent-only; an admin lands on the no-access screen, and the
  // shell header must still say what page that is.
  expect(routeLabelKey("/students", "admin")).toBe("nav.children");
  expect(routeLabelKey("/students", "parent")).toBe("nav.children");
});

test("module gate fails open while the entitlement lookup is unknown", () => {
  expect(primaryNavItems("student", null).map((item) => item.to)).toEqual(primaryNavItems("student").map((item) => item.to));
  expect(primaryNavItems("student", undefined).map((item) => item.to)).toEqual(primaryNavItems("student").map((item) => item.to));
});

test("module gate hides nests the school did not buy", () => {
  const enabled = ["courses", "notes"];
  const primary = primaryNavItems("student", enabled).map((item) => item.to);
  expect(primary).toContain("/courses");
  expect(primary).not.toContain("/marks");
  const sidebar = sidebarNavGroups("teacher", enabled).flatMap((group) => group.items.map((item) => item.to));
  expect(sidebar).not.toContain("/meals");
  expect(sidebar).not.toContain("/messages");
});

test("ungated entries never drop on module filtering", () => {
  expect(moduleVisible({ id: "x", to: "/calendar", labelKey: "nav.calendar", Icon: (() => null) as never }, [])).toBe(true);
});
