import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import CalendarPage from "@/pages/calendar-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { failExams, getExams, getEvents, getHomework, getAppointments } = vi.hoisted(() => ({
  failExams: { times: 0 },
  getExams: vi.fn(),
  getEvents: vi.fn(),
  getHomework: vi.fn(),
  getAppointments: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/calendar", search: {}, searchStr: "", hash: "" }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "u-1", username: "teacher", role: "teacher" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
const page = <T,>(items: T[], total = items.length) => ({ items, total, limit: 100, offset: 0 });
vi.mock("@/api/time", () => ({ getTime: vi.fn(async () => ({ now: Date.now() })) }));
vi.mock("@/api/events", () => ({ getEvents }));
vi.mock("@/api/exams", () => ({ getExams }));
vi.mock("@/api/homework", () => ({ getHomework }));
vi.mock("@/api/appointments", () => ({ getAppointments }));
vi.mock("@/api/courses", () => ({ getCourses: vi.fn(async () => page([])) }));
vi.mock("@/api/instances", () => ({
  getMyInstances: vi.fn(async () => page([])),
  getInstanceSessions: vi.fn(async () => page([])),
}));

// The page bounds its month feeds by the visible month; the test recomputes
// the same bounds the page derives from today at mount.
const monthBounds = () => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
  };
};
const homeworkRows = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => ({ id: `hw${offset + i}`, title: `H${offset + i}`, due_at: Date.now() + i, class_course: "c1" }));

beforeEach(() => {
  getEvents.mockImplementation(async () => page([]));
  getHomework.mockImplementation(async () => page([]));
  getAppointments.mockImplementation(async () => page([]));
  getExams.mockImplementation(async () => {
    if (failExams.times > 0) {
      failExams.times -= 1;
      throw new Error("exams are down");
    }
    return page([]);
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("a failed feed is named above the grid instead of reading as an empty calendar", async () => {
  failExams.times = 1;
  render(() => (
    <PreferencesProvider>
      <CalendarPage />
    </PreferencesProvider>
  ));

  const notice = await screen.findByRole("alert");
  expect(notice.textContent).toMatch(/Exams|Sınavlar/);
  expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();

  fireEvent.click(within(notice).getByRole("button"));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(getExams).toHaveBeenCalledTimes(2);
});

test("homework and appointments feeds read the visible month window, one bounded page at a time", async () => {
  render(() => (
    <PreferencesProvider>
      <CalendarPage />
    </PreferencesProvider>
  ));

  const { start, end } = monthBounds();
  await waitFor(() => expect(getHomework).toHaveBeenCalled());
  expect(getHomework).toHaveBeenCalledWith({ due_after: start, due_before: end, limit: 100, offset: 0 });
  await waitFor(() => expect(getAppointments).toHaveBeenCalled());
  expect(getAppointments).toHaveBeenCalledWith({ starts_after: start, starts_before: end, limit: 100, offset: 0 });
  // Events and exams keep their open-ended window from the grid's first day,
  // now with an explicit page size instead of an unpaged read.
  expect(getEvents).toHaveBeenCalledWith({ ends_after: expect.any(Number), limit: 100, offset: 0 });
  expect(getExams).toHaveBeenCalledWith({ ends_after: expect.any(Number), limit: 100, offset: 0 });
});

test("a month window bigger than one page follows offsets until the server total", async () => {
  getHomework.mockImplementation(async (params: { offset?: number }) =>
    params.offset ? page(homeworkRows(50, 100), 150) : page(homeworkRows(100), 150));
  render(() => (
    <PreferencesProvider>
      <CalendarPage />
    </PreferencesProvider>
  ));

  await waitFor(() => expect(getHomework).toHaveBeenCalledTimes(2));
  expect(getHomework).toHaveBeenLastCalledWith({
    due_after: monthBounds().start,
    due_before: monthBounds().end,
    limit: 100,
    offset: 100,
  });
});
