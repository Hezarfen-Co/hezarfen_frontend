import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import MarksPage from "@/pages/marks-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { navigate, search, getMyAttendance, getMyMarks } = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: { tab: "marks" as "marks" | "attendance" },
  getMyAttendance: vi.fn(),
  getMyMarks: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Navigate: () => null,
  Link: () => null,
  useNavigate: () => navigate,
  useSearch: () => () => search,
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "student-1", username: "student", role: "student" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/api/reports", () => ({ getMyAttendance, getMyMarks }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  search.tab = "marks";
});

test("progress keeps report card and attendance in tabs", async () => {
  getMyMarks.mockResolvedValue({ user: "student-1", overall_average: 80, courses: [] });
  getMyAttendance.mockResolvedValue({
    user: "student-1",
    events: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
    sessions: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
    courses: [],
  });

  render(() => <PreferencesProvider><MarksPage /></PreferencesProvider>);

  expect(await screen.findByRole("tab", { name: "Grades" })).toBeTruthy();
  const attendanceTab = screen.getByRole("tab", { name: "Attendance" });
  fireEvent.click(attendanceTab);
  await waitFor(() => expect(getMyAttendance).toHaveBeenCalledTimes(1));
  expect(attendanceTab.getAttribute("aria-selected")).toBe("true");
  expect(navigate).toHaveBeenCalledWith({ to: "/marks", search: { tab: "attendance" } });
});
