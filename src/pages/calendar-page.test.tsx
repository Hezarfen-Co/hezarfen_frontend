import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import CalendarPage from "@/pages/calendar-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { failExams, getExams } = vi.hoisted(() => ({ failExams: { times: 0 }, getExams: vi.fn() }));

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
const page = <T,>(items: T[]) => ({ items, total: items.length, limit: 100, offset: 0 });
vi.mock("@/api/time", () => ({ getTime: vi.fn(async () => ({ now: Date.now() })) }));
vi.mock("@/api/events", () => ({ getEvents: vi.fn(async () => page([])) }));
vi.mock("@/api/exams", () => ({ getExams }));
vi.mock("@/api/homework", () => ({ getHomework: vi.fn(async () => page([])) }));
vi.mock("@/api/appointments", () => ({ getAppointments: vi.fn(async () => page([])) }));
vi.mock("@/api/courses", () => ({ getCourses: vi.fn(async () => page([])) }));
vi.mock("@/api/instances", () => ({
  getMyInstances: vi.fn(async () => page([])),
  getInstanceSessions: vi.fn(async () => page([])),
}));

beforeEach(() => {
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
