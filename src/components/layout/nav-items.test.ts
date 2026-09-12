import { moduleVisible, pathActive, primaryNavItems, primaryPathActive, routeLabelKey, routeNavItem, visibleNavGroups, visibleNavItems } from "@/components/layout/nav-items";

test.each([
  ["student", ["/", "/exams", "/marks"]],
  ["teacher", ["/", "/management/classes", "/calendar"]],
  ["manager", ["/", "/management/classes", "/exams"]],
  ["admin", ["/", "/management/classes", "/exams"]],
  ["parent", ["/", "/students", "/appointments"]],
] as const)("%s gets role-specific primary destinations", (role, expected) => {
  expect(primaryNavItems(role).map((item) => item.to)).toEqual(expected);
});

test("invalid role destinations stay hidden", () => {
  expect(visibleNavItems("teacher").map((item) => item.to)).not.toContain("/admin/users");
  expect(visibleNavItems("student").map((item) => item.to)).not.toContain("/admin/users");
  expect(visibleNavItems("parent").map((item) => item.to)).not.toContain("/management/staff-work");
});

test("admin's sidebar mirrors the Figma Operasyon / Yapay zekâ / Kurum tree", () => {
  expect(
    visibleNavGroups("admin").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    {
      id: "operations",
      items: [
        "students-roster",
        "teachers-roster",
        "class-groups",
        "schedule",
        "student-attendance",
        "exams",
        "question-bank",
        "mock-exams",
        "optical-reading",
        "payments-collection",
      ],
    },
    { id: "ai", items: ["hezarfen-zeka", "celebi", "sound-studio"] },
    {
      id: "institution",
      items: ["reports", "license-modules", "users", "data-protection", "school-meals", "staff-work", "settings"],
    },
  ]);
});

test("manager sees the same admin tree minus the admin-only entries", () => {
  const institution = visibleNavGroups("manager").find((group) => group.id === "institution");
  expect(institution?.items.map((item) => item.id)).toEqual(["reports", "school-meals", "staff-work", "settings"]);
  expect(institution?.items.map((item) => item.id)).not.toContain("license-modules");
  expect(institution?.items.map((item) => item.id)).not.toContain("users");
  expect(institution?.items.map((item) => item.id)).not.toContain("data-protection");
});

test("teacher's sidebar mirrors the Figma Sınıfım / Yapay zekâ / Diğer tree", () => {
  expect(
    visibleNavGroups("teacher").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "my-classroom", items: ["my-classes", "my-schedule", "student-attendance", "homework", "exams", "whiteboards"] },
    { id: "ai", items: ["student-analysis", "pending-approvals", "question-generation", "sound-studio"] },
    { id: "other", items: ["parent-communication", "work", "settings-teacher"] },
  ]);
});

test("student's sidebar mirrors the Figma Çalışma / Yapay zekâ / Diğer tree", () => {
  expect(
    visibleNavGroups("student").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "study", items: ["study-plan", "topic-mastery", "exam-results", "my-homework", "whiteboards", "pomodoro"] },
    { id: "ai", items: ["celebi", "sound-studio"] },
    { id: "other", items: ["calendar", "settings-student"] },
  ]);
});

test("parent's sidebar mirrors the Figma Öğrencim / Kurum tree", () => {
  expect(
    visibleNavGroups("parent").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "my-student", items: ["progress-report", "absence", "child-exam-results", "child-study-plan"] },
    { id: "institution", items: ["payment-statement", "appointments", "settings-parent"] },
  ]);
});

test("appointments is a parent-only sidebar entry, matching the Figma parent screen", () => {
  expect(visibleNavGroups("parent").flatMap((g) => g.items).map((i) => i.to)).toContain("/appointments");
  for (const role of ["student", "teacher", "manager", "admin"] as const) {
    const paths = [...primaryNavItems(role).map((i) => i.to), ...visibleNavGroups(role).flatMap((g) => g.items.map((i) => i.to))];
    expect(paths).not.toContain("/appointments");
  }
});

test("entries with no backend yet are flagged soon and route to the shared placeholder", () => {
  const hezarfenZeka = visibleNavGroups("admin")
    .flatMap((g) => g.items)
    .find((i) => i.id === "hezarfen-zeka");
  expect(hezarfenZeka?.soon).toBe(true);
  expect(hezarfenZeka?.to).toBe("/coming-soon/hezarfen-zeka");
});

test("Çelebi and account settings open an existing shell surface instead of navigating", () => {
  const celebi = visibleNavGroups("student")
    .flatMap((g) => g.items)
    .find((i) => i.id === "celebi");
  expect(celebi?.action).toBe("celebi");
  const settings = visibleNavGroups("student")
    .flatMap((g) => g.items)
    .find((i) => i.id === "settings-student");
  expect(settings?.action).toBe("profile");
});

test("nested entity routes keep their primary destination active", () => {
  expect(pathActive("/management/classes/class-1", "/management/classes")).toBe(true);
  expect(routeNavItem("/management/classes/class-1", "teacher")?.id).toBe("my-classes");
  expect(routeNavItem("/management/student-attendance", "teacher")?.id).toBe("student-attendance");
  expect(primaryPathActive("/exams/exam-1", primaryNavItems("student")[1]!)).toBe(true);
});

test.each([
  ["/homework/hw-1", "student", "my-homework"],
  ["/homework/hw-1", "teacher", "homework"],
  ["/management/student-attendance", "teacher", "student-attendance"],
  ["/management/settings", "manager", "settings"],
] as const)("sidebar resolves one active item for %s", (pathname, role, expected) => {
  const items = [...primaryNavItems(role), ...visibleNavGroups(role).flatMap((group) => group.items)];
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
  ["/courses", "nav.courses"],
  ["/courses/course-1", "nav.courses"],
  ["/notes", "nav.notes"],
  ["/questions", "nav.questions"],
  ["/events", "nav.events"],
  ["/meals", "nav.meals"],
] as const)("%s has a header label", (pathname, expected) => {
  expect(routeLabelKey(pathname, "student")).toBe(expected);
});

test("routes with a sidebar entry still take their nav label", () => {
  expect(routeLabelKey("/homework/hw-1", "teacher")).toBe(routeNavItem("/homework/hw-1", "teacher")?.labelKey);
});

test("a route rendered outside the shell has no label rather than a raw path", () => {
  expect(routeLabelKey("/login", undefined)).toBeUndefined();
});

test("a page keeps its name for a viewer who may not open it", () => {
  // /students is parent-only; an admin lands on the no-access screen, and the
  // shell header must still say what page that is.
  expect(routeLabelKey("/students", "admin")).toBe("nav.progressReport");
  expect(routeLabelKey("/students", "parent")).toBe("nav.progressReport");
});

test("module gate fails open while the entitlement lookup is unknown", () => {
  expect(primaryNavItems("student", null).map((item) => item.to)).toEqual(primaryNavItems("student").map((item) => item.to));
  expect(primaryNavItems("student", undefined).map((item) => item.to)).toEqual(primaryNavItems("student").map((item) => item.to));
});

test("module gate hides nests the school did not buy", () => {
  const enabled = ["courses"];
  const teacherPaths = visibleNavGroups("teacher", enabled).flatMap((group) => group.items.map((item) => item.to));
  expect(teacherPaths).not.toContain("/homework");
  expect(teacherPaths).not.toContain("/exams");
  expect(teacherPaths).not.toContain("/whiteboards");
  expect(teacherPaths).toContain("/management/classes");
  expect(teacherPaths).toContain("/calendar");
});

test("ungated entries never drop on module filtering", () => {
  expect(moduleVisible({ id: "x", to: "/calendar", labelKey: "nav.calendar", Icon: (() => null) as never }, [])).toBe(true);
});
