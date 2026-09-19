import { moduleVisible, pathActive, primaryNavItems, primaryPathActive, routeLabelKey, routeNavItem, visibleNavGroups, visibleNavItems } from "@/components/layout/nav-items";

test.each([
  ["student", ["/", "/homework", "/exams"]],
  ["teacher", ["/", "/management/classes", "/management/student-attendance"]],
  ["manager", ["/", "/management/students", "/management/classes"]],
  ["admin", ["/", "/management/students", "/management/classes"]],
  ["parent", ["/", "/students", "/appointments"]],
] as const)("%s gets role-specific primary destinations", (role, expected) => {
  expect(primaryNavItems(role).map((item) => item.to)).toEqual(expected);
});

test("every mobile tab reuses its sidebar row's icon and label", () => {
  for (const role of ["student", "parent", "teacher", "manager", "admin"] as const) {
    const sidebar = visibleNavGroups(role).flatMap((group) => group.items);
    for (const tab of primaryNavItems(role).slice(1)) {
      const row = sidebar.find((item) => item.id === tab.id);
      expect(row?.Icon).toBe(tab.Icon);
      expect(row?.labelKey).toBe(tab.labelKey);
    }
  }
});

test("invalid role destinations stay hidden", () => {
  expect(visibleNavItems("teacher").map((item) => item.to)).not.toContain("/admin/users");
  expect(visibleNavItems("student").map((item) => item.to)).not.toContain("/admin/users");
  expect(visibleNavItems("parent").map((item) => item.to)).not.toContain("/management/staff-work");
});

test("admin's sidebar splits into short labelled sections with the soon shelf last", () => {
  expect(
    visibleNavGroups("admin").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "ai", items: ["ai-studio", "ai-study", "ai-insights", "ai-celebi"] },
    { id: "school", items: ["students-roster", "teachers-roster", "class-groups", "academic-years", "terms", "schedule"] },
    { id: "teaching", items: ["courses", "homework", "exams", "question-bank", "questions", "notes", "whiteboards"] },
    { id: "tracking", items: ["student-attendance", "student-marks", "student-pomodoros"] },
    { id: "services", items: ["events", "appointments", "school-meals"] },
    { id: "institution", items: ["payments-collection", "staff-work", "work", "users", "license-modules", "settings"] },
    { id: "soon", items: ["mock-exams", "optical-reading", "reports", "data-protection"] },
  ]);
});

test("manager sees the same admin tree minus the admin-only entries", () => {
  const groups = visibleNavGroups("manager");
  const institution = groups.find((group) => group.id === "institution");
  expect(institution?.items.map((item) => item.id)).toEqual(["payments-collection", "staff-work", "work", "settings"]);
  const ids = groups.flatMap((group) => group.items.map((item) => item.id));
  expect(ids).not.toContain("license-modules");
  expect(ids).not.toContain("users");
  expect(ids).not.toContain("data-protection");
});

test("teacher's sidebar splits into short labelled sections with the soon shelf last", () => {
  expect(
    visibleNavGroups("teacher").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "ai", items: ["ai-studio", "ai-study", "ai-insights", "ai-celebi"] },
    { id: "my-classroom", items: ["my-classes", "my-schedule", "courses"] },
    { id: "tracking", items: ["student-attendance", "student-marks", "student-pomodoros"] },
    { id: "teaching", items: ["homework", "exams", "question-bank", "questions", "notes", "whiteboards"] },
    { id: "other", items: ["parent-communication", "appointments", "events", "meals", "work", "settings-teacher"] },
    { id: "soon", items: ["student-analysis", "pending-approvals", "question-generation"] },
  ]);
});

test("student's sidebar splits into short labelled sections with the soon shelf last", () => {
  expect(
    visibleNavGroups("student").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "ai", items: ["ai-studio", "ai-study", "ai-insights", "ai-celebi"] },
    { id: "study", items: ["topic-mastery", "exam-results", "my-homework", "pomodoro"] },
    { id: "teaching", items: ["courses", "notes", "questions", "whiteboards"] },
    { id: "other", items: ["calendar", "events", "messages", "appointments", "meals", "settings-student"] },
    { id: "soon", items: ["study-plan"] },
  ]);
});

test("every soon entry sits in the folded soon shelf and nowhere else", () => {
  for (const role of ["student", "parent", "teacher", "manager", "admin"] as const) {
    for (const group of visibleNavGroups(role)) {
      const soon = group.items.filter((item) => item.soon);
      if (group.id === "soon") {
        expect(group.defaultFolded).toBe(true);
        expect(soon).toHaveLength(group.items.length);
      } else {
        expect(soon).toHaveLength(0);
      }
    }
  }
});

test("parent's sidebar keeps the Figma Öğrencim / Kurum tree plus every backed page", () => {
  expect(
    visibleNavGroups("parent").map((group) => ({
      id: group.id,
      items: group.items.map((item) => item.id),
    })),
  ).toEqual([
    { id: "ai", items: ["ai-insights"] },
    { id: "my-student", items: ["progress-report", "absence", "child-exam-results", "child-study-plan"] },
    { id: "institution", items: ["payment-statement", "appointments", "messages", "calendar", "events", "meals", "settings-parent"] },
    // A parent's only AI surface: their children's analysis.
  ]);
});

test("appointments and meals are reachable from every role's sidebar", () => {
  for (const role of ["student", "parent", "teacher", "manager", "admin"] as const) {
    const paths = visibleNavGroups(role).flatMap((g) => g.items.map((i) => i.to));
    expect(paths).toContain("/appointments");
    expect(paths).toContain("/meals");
  }
});

test("parent's child entries open the progress page on their own tab, not a placeholder", () => {
  const items = visibleNavGroups("parent").flatMap((g) => g.items);
  expect(items.filter((i) => i.soon).map((i) => i.id)).toEqual([]);
  expect(routeNavItem("/students/attendance", "parent")?.id).toBe("absence");
  expect(routeNavItem("/students/exams", "parent")?.id).toBe("child-exam-results");
  expect(routeNavItem("/students/study", "parent")?.id).toBe("child-study-plan");
  expect(routeNavItem("/students", "parent")?.id).toBe("progress-report");
});

test("license modules is a real admin page and the work log includes admin", () => {
  const admin = visibleNavGroups("admin").flatMap((g) => g.items);
  const licenseModules = admin.find((i) => i.id === "license-modules");
  expect(licenseModules?.to).toBe("/management/modules");
  expect(licenseModules?.soon).toBeFalsy();
  expect(admin.map((i) => i.to)).toContain("/work");
  expect(admin.filter((i) => i.id.endsWith("-roster")).map((i) => [i.to, i.soon ?? false])).toEqual([
    ["/management/students", false],
    ["/management/teachers", false],
  ]);
  expect(visibleNavGroups("manager").flatMap((g) => g.items).map((i) => i.id)).not.toContain("license-modules");
});

test("entries with no backend yet are flagged soon and route to the shared placeholder", () => {
  const opticalReading = visibleNavGroups("admin")
    .flatMap((g) => g.items)
    .find((i) => i.id === "optical-reading");
  expect(opticalReading?.soon).toBe(true);
  expect(opticalReading?.to).toBe("/coming-soon/optik-okuma");
});

test("the AI group exposes four separate module routes", () => {
  for (const role of ["student", "teacher", "manager", "admin"] as const) {
    const ai = visibleNavGroups(role).find((group) => group.id === "ai");
    expect(ai?.items.map((item) => item.id)).toEqual(["ai-studio", "ai-study", "ai-insights", "ai-celebi"]);
    expect(ai?.items.every((item) => !item.soon)).toBe(true);
  }
  expect(visibleNavGroups("parent").find((group) => group.id === "ai")?.items.map((item) => item.id)).toEqual(["ai-insights"]);
  expect(routeNavItem("/ai/studio", "student")?.id).toBe("ai-studio");
  expect(routeNavItem("/ai/insights", "parent")?.id).toBe("ai-insights");
  expect(routeLabelKey("/ai/studio", "student")).toBe("aiHub.tab.studio");
});

test("AI modules navigate while Çelebi and account settings open shell surfaces", () => {
  const celebi = visibleNavGroups("student")
    .flatMap((g) => g.items)
    .find((i) => i.id === "ai-celebi");
  expect(celebi?.to).toBe("");
  expect(celebi?.action).toBe("celebi");
  expect(routeNavItem("/ai/celebi", "student")).toBeUndefined();
  const settings = visibleNavGroups("student")
    .flatMap((g) => g.items)
    .find((i) => i.id === "settings-student");
  expect(settings?.action).toBe("profile");
});

test("nested entity routes keep their primary destination active", () => {
  expect(pathActive("/management/classes/class-1", "/management/classes")).toBe(true);
  expect(routeNavItem("/management/classes/class-1", "teacher")?.id).toBe("my-classes");
  expect(routeNavItem("/management/student-attendance", "teacher")?.id).toBe("student-attendance");
  expect(primaryPathActive("/homework/hw-1", primaryNavItems("student")[1]!)).toBe(true);
});

test.each([
  ["/homework/hw-1", "student", "my-homework"],
  ["/homework/hw-1", "teacher", "homework"],
  ["/management/student-attendance", "teacher", "student-attendance"],
  ["/management/settings", "manager", "settings"],
] as const)("sidebar resolves one active item for %s", (pathname, role, expected) => {
  // Mobile tabs reuse the sidebar's own item objects, so dedupe by identity.
  const items = [...new Set([...primaryNavItems(role), ...visibleNavGroups(role).flatMap((group) => group.items)])];
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
  ["/courses", "nav.classes"],
  ["/courses/course-1", "nav.classes"],
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
  // Classes is a module too, so an unbought "classes" nest hides it; the
  // schedule carries no module and stays.
  expect(teacherPaths).not.toContain("/management/classes");
  expect(visibleNavGroups("teacher", ["courses", "classes"]).flatMap((group) => group.items.map((item) => item.to)))
    .toContain("/management/classes");
  expect(teacherPaths).toContain("/calendar");
});

test("ungated entries never drop on module filtering", () => {
  expect(moduleVisible({ id: "x", to: "/calendar", labelKey: "nav.calendar", Icon: (() => null) as never }, [])).toBe(true);
});
