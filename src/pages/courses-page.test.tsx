import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import CoursesPage from "@/pages/courses-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getCourses, getMyCourses, navigate } = vi.hoisted(() => ({
  getCourses: vi.fn(),
  getMyCourses: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => navigate,
  useSearch: () => () => ({ kind: undefined, action: undefined }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "student-1", username: "student", role: "student" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/api/courses", () => ({
  getCourses,
  postCourse: vi.fn(),
  postCourseTeacher: vi.fn(),
}));
vi.mock("@/api/reports", () => ({ getMyCourses }));
vi.mock("@/api/terms", () => ({
  getTerms: async () => ({ items: [{ id: "term-1", name: "Fall" }], total: 1, limit: 100, offset: 0 }),
}));
vi.mock("@/api/limits", () => ({ getLimits: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("student class directory uses only enrolled-course data", async () => {
  getMyCourses.mockResolvedValue({
    items: [
      {
        id: "course-1",
        title: "Algebra",
        description: "Core mathematics",
        kind: "course",
        term: "term-1",
        capacity: 24,
        creator: { id: "teacher-1", username: "teacher", display_name: "Ada Teacher" },
        teachers: [],
      },
      {
        id: "study-1",
        title: "Study Lab",
        description: "Weekly review",
        kind: "study",
        term: null,
        capacity: 12,
        creator: { id: "teacher-1", username: "teacher", display_name: "Ada Teacher" },
        teachers: [],
      },
      {
        id: "club-1",
        title: "Robotics",
        description: "Build robots",
        kind: "club",
        term: "term-1",
        capacity: 18,
        creator: { id: "teacher-2", username: "mentor", display_name: "Club Mentor" },
        teachers: [],
      },
    ],
    total: 3,
    limit: 3,
    offset: 0,
  });

  render(() => <PreferencesProvider><CoursesPage /></PreferencesProvider>);

  expect(await screen.findByRole("link", { name: /Algebra/ })).toBeTruthy();
  expect(screen.getAllByText("Enrolled")).toHaveLength(3);
  expect(getMyCourses).toHaveBeenCalledWith();
  expect(getCourses).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("tab", { name: "Study" }));
  expect(await screen.findByRole("link", { name: /Study Lab/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Algebra/ })).toBeNull();
  expect(getMyCourses).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith({
    to: "/courses",
    search: { action: undefined, kind: "study" },
    replace: true,
  });

  fireEvent.click(screen.getByRole("tab", { name: "Club" }));
  expect(await screen.findByRole("link", { name: /Robotics/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Study Lab/ })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "Classes" }));
  expect(await screen.findByRole("link", { name: /Algebra/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Robotics/ })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "robot" } });
  await waitFor(() => expect(screen.getByRole("link", { name: /Robotics/ })).toBeTruthy());
  expect(screen.queryByRole("link", { name: /Algebra/ })).toBeNull();

  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Term", { selector: "select" }), { target: { value: "unassigned" } });
  expect(await screen.findByRole("link", { name: /Study Lab/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Robotics/ })).toBeNull();
});
