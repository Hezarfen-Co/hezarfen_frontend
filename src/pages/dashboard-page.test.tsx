import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import DashboardPage from "@/pages/dashboard-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { navigate, authUser, schoolModules, calls, refuseExams, failExams } = vi.hoisted(() => ({
  navigate: vi.fn(),
  authUser: { authenticated: true, role: "student" },
  // null = module state unknown (fail open, everything shown).
  schoolModules: { enabled: null as string[] | null },
  calls: [] as string[],
  refuseExams: { on: false },
  failExams: { times: 0 },
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => (
    <a href={props.to} class={props.class}>{props.children}</a>
  ),
  Navigate: (props: { to: string }) => <span>redirect:{props.to}</span>,
  useNavigate: () => navigate,
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => authUser.authenticated ? ({
      id: "u-1",
      username: "demo",
      role: authUser.role,
      name: "Demo",
      surname: "User",
    }) : null,
    loading: () => false,
    error: () => undefined,
    refresh: async () => undefined,
  }),
}));

const now = Date.UTC(2026, 6, 28, 9);
const DAY = 24 * 60 * 60 * 1000;
const page = <T,>(items: T[]) => ({ items, total: items.length, limit: 50, offset: 0 });
const course = { id: "course-1", title: "Algebra", class_course_count: 1, course_membership_count: 0 };
// Exams, homework and rosters hang off the instance (şube × ders); the catalog
// course is one hop away, which is what the dashboard resolves for its labels.
const instance = {
  id: "instance-1",
  class: "class-1",
  course: "course-1",
  ders_saati: 4,
  counts_toward_karne: true,
  enrollment_count: 0,
  teachers: [],
};

vi.mock("@/stores/modules-context", () => ({
  useModules: () => ({
    enabled: () => schoolModules.enabled,
    loading: () => false,
    isEnabled: (module: string) => schoolModules.enabled === null || schoolModules.enabled.includes(module),
    refresh: () => {},
  }),
}));
vi.mock("@/api/modules", () => ({ getModulesCatalog: async () => ({ modules: [], packages: [] }) }));
vi.mock("@/api/time/getTime", () => ({ getTime: async () => ({ now }) }));
vi.mock("@/api/courses", () => ({
  getCourses: async () => page([course]),
}));
vi.mock("@/api/instances", () => ({
  getMyInstances: async () => page([instance]),
  getInstanceEnrollments: async () => page([]),
  getInstanceSessions: async () => page([
    { id: "session-today", class_course: "instance-1", teacher: { id: "u-1", username: "demo", display_name: null }, topic: "Fractions", starts_at: now, ends_at: now + 40 * 60 * 1000 },
    { id: "session-old", class_course: "instance-1", teacher: { id: "u-1", username: "demo", display_name: null }, topic: "Old", starts_at: now - 3 * DAY, ends_at: null },
  ]),
}));
vi.mock("@/api/sessions", () => ({
  getSessionAttendance: async () => ({ items: [], total: 0, limit: 1, offset: 0 }),
}));
vi.mock("@/api/reports", () => ({
  getMyCourses: async () => page([course]),
  getMyMarks: async () => (calls.push("marks"), {
    overall_average: 82.5,
    courses: [{
      instance: instance.id,
      course,
      average: 82.5,
      results: [{ exam: "exam-past", title: "Midterm", kind: "exam", weight: 1, mark: 78, graded_by: "t-1" }],
    }],
  }),
  getMyAttendance: async () => ({
    events: { total: 3, present: 2, absent: 1, late: 0, excused: 0 },
    sessions: { total: 2, present: 1, absent: 0, late: 1, excused: 0 },
  }),
  getUserAttendance: async () => ({
    events: { total: 3, present: 2, absent: 1, late: 0, excused: 0 },
    sessions: { total: 2, present: 1, absent: 0, late: 1, excused: 0 },
  }),
}));
vi.mock("@/api/payments", () => ({
  getPaymentStatementByUserId: async () => ({
    student: { id: "child-1", username: "child", display_name: "Child" },
    entries: page([]),
    balance_minor: 0,
  }),
}));
vi.mock("@/api/exams", async () => {
  const { ApiError } = await import("@/api/client");
  return {
  getExams: async () => {
    // A builder switched exams off after the modules list was read.
    if (refuseExams.on) throw new ApiError(403, "forbidden", null, "exams");
    // A plain server failure, not a module refusal.
    if (failExams.times > 0) {
      failExams.times -= 1;
      throw new Error("exams are down");
    }
    return page([
    {
      id: "exam-1",
      title: "Exam deadline",
      class_course: "instance-1",
      draft: false,
      starts_at: now + 1_000,
      ends_at: now + 3_000,
    },
    {
      id: "exam-past",
      title: "Midterm",
      class_course: "instance-1",
      draft: false,
      starts_at: now - 10 * DAY,
      ends_at: now - 10 * DAY + 3_000,
    },
  ]);
  },
  getExamStatistics: async (examId: string) => ({
    exam: examId,
    graded: 12,
    average: 74.5,
    min: 40,
    max: 96,
  }),
  };
});
vi.mock("@/api/pomodoro", () => ({
  getPomodoroMe: async () => ({
    items: [
      { id: "pom-1", user: "u-1", started_at: now - 3 * DAY, finished_at: now - 3 * DAY + 1_500_000, duration_ms: 1_500_000 },
      { id: "pom-2", user: "u-1", started_at: now - DAY, finished_at: now - DAY + 3_000_000, duration_ms: 3_000_000 },
    ],
    total: 2,
    limit: 400,
    offset: 0,
    total_focus_ms: 4_500_000,
  }),
}));
vi.mock("@/api/events", () => ({
  getEvents: async () => page([
    {
      id: "event-1",
      title: "Event deadline",
      starts_at: now + 2_000,
      ends_at: now + 4_000,
    },
    { id: "event-past", title: "Past event", starts_at: now - 5 * DAY, ends_at: now - 5 * DAY + 1_000 },
  ]),
}));
vi.mock("@/api/homework", () => ({
  getHomeworkSubmissions: async () => page([
    { user: "s-1", submission: null, result: null, missing: true, unenrolled: false },
    { user: "s-2", submission: { text: "x", submitted_at: now, updated_at: now, late: false, files: [] }, result: null, missing: false, unenrolled: false },
    { user: "s-3", submission: { text: "y", submitted_at: now, updated_at: now, late: false, files: [] }, result: null, missing: false, unenrolled: false },
  ]),
  getHomeworkReport: async () => page([
    { class_course: "instance-1", homework: "hw-late", title: "Essay draft", subject: "s-1", due_at: now - 2 * DAY, submitted: false, late: false, missing: true, result: null },
    { class_course: "instance-1", homework: "hw-soon", title: "Worksheet 4", subject: "s-1", due_at: now + 2 * DAY, submitted: false, late: false, missing: false, result: null },
    { class_course: "instance-1", homework: "hw-done", title: "Handed in", subject: "s-1", due_at: now + DAY, submitted: true, late: false, missing: false, result: null },
  ]),
  getHomework: async () => page([
    {
      id: "homework-1",
      title: "Homework deadline",
      due_at: now + 5_000,
      created_by: "u-1",
    },
    { id: "homework-past", title: "Past homework", due_at: now - 6 * DAY },
  ]),
}));
vi.mock("@/api/appointments", () => ({
  getAppointments: async () => page([{
    id: "appointment-1",
    status: "approved",
    starts_at: now + 6_000,
    ends_at: now + 7_000,
    teacher: { username: "teacher", display_name: "Teacher Name" },
  }]),
}));
vi.mock("@/api/parents", () => ({
  getMyStudents: async () => page([{ id: "child-1" }]),
}));
vi.mock("@/api/meals", () => ({
  getMealMenus: async () => page([{ id: "menu-1" }]),
}));
vi.mock("@/api/classes", () => ({
  getMyClasses: async () => page([{ id: "class-1", name: "9-A" }]),
  getClassesByUserId: async () => page([]),
  getClasses: async () => page([]),
}));
vi.mock("@/api/academic-years", () => ({
  getAcademicYears: async () => page([{ id: "y-1", name: "2026-2027" }]),
}));
vi.mock("@/api/users", () => ({
  getUsers: async () => page([]),
  getUserSearch: async () => page([]),
}));

afterEach(() => {
  cleanup();
  navigate.mockReset();
  authUser.authenticated = true;
  schoolModules.enabled = null;
  calls.length = 0;
  refuseExams.on = false;
  failExams.times = 0;
});

function renderDashboard(role: string) {
  authUser.role = role;
  return render(() => (
    <PreferencesProvider>
      <DashboardPage />
    </PreferencesProvider>
  ));
}

test("logged-out visitor redirects before dashboard reads user role", () => {
  authUser.authenticated = false;
  renderDashboard("student");

  expect(screen.getByText("redirect:/login")).toBeTruthy();
});

test("student sees own trend plus focus heatmap, and a standalone deadlines table", async () => {
  renderDashboard("student");

  expect(await screen.findByText("Course averages")).toBeTruthy();
  expect(screen.getByText("Success trend")).toBeTruthy();
  expect(screen.getByText("Your exam marks over time.")).toBeTruthy();
  expect(screen.getByText("Attendance split")).toBeTruthy();
  expect(screen.queryByText("Teaching resources")).toBeNull();
  // The table stands alone now — no side panel, so no column span and no
  // "Appointments" shortcut in its header.
  expect(screen.queryByRole("link", { name: "Appointments" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).not.toContain("col-span");
  // A student's heatmap is their own focus log, never school-wide records.
  expect(screen.getByText("Focus activity")).toBeTruthy();
  expect(screen.queryByText("School activity")).toBeNull();
  // Sessions are bucketed per calendar day: 25 min three days ago, 50 min yesterday.
  expect(screen.getByLabelText(/25 min focus/)).toBeTruthy();
  expect(screen.getByLabelText(/50 min focus/)).toBeTruthy();
  expect(screen.getByText("75 min in the last 26 weeks")).toBeTruthy();
  expect(screen.getByRole("img", { name: /Algebra: Midterm.*78/ })).toBeTruthy();
  expect(document.querySelectorAll("[data-chart-tooltip]").length).toBeGreaterThan(0);
  expect(screen.queryByText("Priority")).toBeNull();
  expect(screen.queryByText("Refresh data")).toBeNull();
  expect(screen.queryByText("Ask a question")).toBeNull();

  fireEvent.click(await screen.findByRole("button", { name: /Event deadline/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Homework deadline/ }), { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("button", { name: /Exam deadline/ }), { key: " " });
  fireEvent.click(screen.getByRole("button", { name: /Teacher Name/ }));

  expect(navigate).toHaveBeenCalledWith({ to: "/events/$id", params: { id: "event-1" } });
  expect(navigate).toHaveBeenCalledWith({ to: "/homework/$id", params: { id: "homework-1" } });
  expect(navigate).toHaveBeenCalledWith({ to: "/exams/$id", params: { id: "exam-1" } });
  expect(navigate).toHaveBeenCalledWith({ to: "/appointments" });
});

test("teacher sees real exam averages instead of capacities and resource links", async () => {
  renderDashboard("teacher");

  // Exam averages come from the backend's own statistics, so the panel reports
  // marks rather than the meaningless capacity/workload counts it replaced.
  expect(await screen.findByText("Class averages of recent exams.")).toBeTruthy();
  expect(screen.getByText("Success trend")).toBeTruthy();
  expect(screen.getByText("Average of recent exams, by course.")).toBeTruthy();
  // The trend point and the per-course bar carry the backend's average.
  expect(await screen.findByRole("img", { name: /Algebra: Midterm.*74\.5/ })).toBeTruthy();
  expect((await screen.findAllByText("74.5")).length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText("Course capacities")).toBeNull();
  expect(screen.queryByText("Workload split")).toBeNull();
  expect(screen.queryByText("Teaching resources")).toBeNull();
  expect(screen.queryByRole("link", { name: /Build and reuse question templates/ })).toBeNull();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).not.toContain("col-span");
  expect(screen.getByText("School activity")).toBeTruthy();
  expect(screen.queryByText("Focus activity")).toBeNull();
  // The heatmap looks backwards, so it must be fed by the unfiltered read —
  // the page's own event/homework resources are future-only and would leave
  // the grid almost entirely empty. One past exam, event, and homework each.
  expect((await screen.findAllByLabelText(/: 1 records/)).length).toBe(3);
});

test("parent sees family highlights and appointment deadlines without staff charts", async () => {
  renderDashboard("parent");

  expect(await screen.findByText("Children")).toBeTruthy();
  expect(screen.getAllByText("Appointments").length).toBeGreaterThan(0);
  expect(screen.getByText("Meal menus")).toBeTruthy();
  expect(screen.queryByText("Progress overview")).toBeNull();
  expect(screen.queryByText("Success trend")).toBeNull();
  expect(screen.queryByText("Teaching resources")).toBeNull();
  expect(await screen.findByRole("button", { name: /Teacher Name/ })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).not.toContain("col-span");
});

test("switched-off modules leave no tile, panel or request behind", async () => {
  schoolModules.enabled = ["courses", "exams", "events", "homework", "appointments", "meals", "classes"];
  renderDashboard("student");

  expect(await screen.findByRole("heading", { name: "Upcoming deadlines" })).toBeTruthy();
  expect(screen.queryByText("Course averages")).toBeNull();
  expect(screen.queryByText("Attendance split")).toBeNull();
  expect(screen.queryByText("Focus activity")).toBeNull();
  expect(calls).not.toContain("marks");
});

test("a module refusal mid-session reads as no data instead of breaking the board", async () => {
  refuseExams.on = true;
  renderDashboard("manager");

  expect(await screen.findByRole("heading", { name: "Upcoming deadlines" })).toBeTruthy();
  expect(screen.queryByText(/permission|switched off/i)).toBeNull();
});

test("a failed source leaves the other panels up and can be retried", async () => {
  failExams.times = 1;
  renderDashboard("manager");

  const notice = await screen.findByRole("alert");
  expect(notice.textContent).toMatch(/could not load|yüklenemedi/);
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" })).toBeTruthy();
  expect(await screen.findByText("Event deadline")).toBeTruthy();

  fireEvent.click(within(notice).getByRole("button"));
  expect(await screen.findByText("Exam deadline")).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

test("a teacher's board leads with today's lessons and what their roll call needs", async () => {
  renderDashboard("teacher");

  const panel = await screen.findByRole("region", { name: /Today's lessons|Bugünkü derslerim/ });
  expect(within(panel).getByText("Fractions")).toBeTruthy();
  expect(within(panel).queryByText("Old")).toBeNull();
  expect(within(panel).getByText(/Roll call not taken|Yoklama alınmadı/)).toBeTruthy();
  expect(within(panel).getByRole("link").getAttribute("href")).toBe("/instances/$id");
});

test("a parent sees the child's overdue and due-this-week homework in plain sentences", async () => {
  renderDashboard("parent");

  const panel = await screen.findByRole("region", { name: /^(Homework|Ödevler)$/ });
  expect(within(panel).getByText(/1 homework not handed in|1 ödev teslim edilmedi/)).toBeTruthy();
  expect(within(panel).getByText("Essay draft")).toBeTruthy();
  expect(within(panel).getByText(/1 due this week|1 ödevin teslimi bu hafta/)).toBeTruthy();
  expect(within(panel).getByText("Worksheet 4")).toBeTruthy();
  expect(within(panel).queryByText("Handed in")).toBeNull();
});

test("a student's board shows the day's lessons with no roll-call reads", async () => {
  renderDashboard("student");

  const panel = await screen.findByRole("region", { name: /Today's lessons|Bugünkü derslerin/ });
  expect(within(panel).getByText("Fractions")).toBeTruthy();
  expect(within(panel).getByText(/On now|Şimdi/)).toBeTruthy();
  expect(within(panel).queryByText(/Roll call|Yoklama/)).toBeNull();
});

test("a teacher sees which of their homework is waiting on them, in plain sentences", async () => {
  renderDashboard("teacher");

  const panel = await screen.findByRole("region", { name: /Homework waiting on you|Seni bekleyen ödevler/ });
  expect(within(panel).getByText("Homework deadline")).toBeTruthy();
  expect(within(panel).getByText(/1 not handed in · 2 waiting for a grade|1 teslim etmedi · 2 not bekliyor/)).toBeTruthy();
  expect(within(panel).getByText(/2 to grade|2 notlanacak/)).toBeTruthy();
});

test("an admin sees what school setup still needs, ticked by real counts", async () => {
  renderDashboard("admin");

  const panel = await screen.findByRole("region", { name: /School setup|Okul kurulumu/ });
  const step = (name: RegExp) => within(panel).getByText(name).closest("a")!;
  expect(step(/Academic year|Eğitim yılı/).textContent).toMatch(/Done|Tamam/);
  expect(step(/^(Courses|Dersler)$/).textContent).toMatch(/Done|Tamam/);
  expect(step(/^(Teachers|Öğretmenler)$/).textContent).toMatch(/Not added yet|Henüz eklenmedi/);
  expect(within(panel).getByText(/2 of 5 done|5 adımdan 2 tamam/)).toBeTruthy();
});
