import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import DashboardPage from "@/pages/dashboard-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { navigate, authUser } = vi.hoisted(() => ({
  navigate: vi.fn(),
  authUser: { role: "student" },
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => (
    <a href={props.to} class={props.class}>{props.children}</a>
  ),
  Navigate: () => null,
  useNavigate: () => navigate,
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({
      id: "u-1",
      username: "demo",
      role: authUser.role,
      name: "Demo",
      surname: "User",
    }),
    loading: () => false,
    error: () => undefined,
    refresh: async () => undefined,
  }),
}));

const now = Date.UTC(2026, 6, 28, 9);
const page = <T,>(items: T[]) => ({ items, total: items.length, limit: 50, offset: 0 });
const course = { id: "course-1", title: "Algebra", capacity: 24 };

vi.mock("@/api/time/getTime", () => ({ getTime: async () => ({ now }) }));
vi.mock("@/api/courses", () => ({ getCourses: async () => page([course]) }));
vi.mock("@/api/reports", () => ({
  getMyCourses: async () => page([course]),
  getMyMarks: async () => ({
    overall_average: 82.5,
    courses: [{ course, results: [], average: 82.5 }],
  }),
  getMyAttendance: async () => ({
    events: { total: 3, present: 2, absent: 1, late: 0, excused: 0 },
    sessions: { total: 2, present: 1, absent: 0, late: 1, excused: 0 },
  }),
}));
vi.mock("@/api/exams", () => ({
  getExams: async () => page([{
    id: "exam-1",
    title: "Exam deadline",
    starts_at: now + 1_000,
    ends_at: now + 3_000,
  }]),
}));
vi.mock("@/api/events", () => ({
  getEvents: async () => page([{
    id: "event-1",
    title: "Event deadline",
    starts_at: now + 2_000,
    ends_at: now + 4_000,
  }]),
}));
vi.mock("@/api/homework", () => ({
  getHomework: async () => page([{
    id: "homework-1",
    title: "Homework deadline",
    due_at: now + 5_000,
  }]),
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

afterEach(() => {
  cleanup();
  navigate.mockReset();
});

function renderDashboard(role: string) {
  authUser.role = role;
  return render(() => (
    <PreferencesProvider>
      <DashboardPage />
    </PreferencesProvider>
  ));
}

test("student sees truthful charts, full-width deadlines, and no teaching resources", async () => {
  const view = renderDashboard("student");

  expect(await screen.findByText("Course averages")).toBeTruthy();
  expect(screen.getByText("Attendance split")).toBeTruthy();
  expect(screen.queryByText("Teaching resources")).toBeNull();
  expect(screen.getByRole("link", { name: "Appointments" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).toContain("lg:col-span-3");
  expect(view.container.querySelector("polyline")).toBeNull();
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

test("teacher sees capacities and useful teaching-resource links", async () => {
  renderDashboard("teacher");

  expect(await screen.findByText("Course capacities")).toBeTruthy();
  expect(screen.queryByText("Class sizes")).toBeNull();
  expect(screen.getByText("Workload split")).toBeTruthy();
  expect(screen.getByText("Teaching resources")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Build and reuse question templates/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Review questions submitted by students/ })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).toContain("lg:col-span-2");
});

test("parent sees family highlights and appointment deadlines without staff charts", async () => {
  renderDashboard("parent");

  expect(await screen.findByText("Children")).toBeTruthy();
  expect(screen.getAllByText("Appointments").length).toBeGreaterThan(0);
  expect(screen.getByText("Meal menus")).toBeTruthy();
  expect(screen.queryByText("Progress overview")).toBeNull();
  expect(screen.queryByText("Teaching resources")).toBeNull();
  expect(await screen.findByRole("button", { name: /Teacher Name/ })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Upcoming deadlines" }).closest("section")?.className).toContain("lg:col-span-3");
});
