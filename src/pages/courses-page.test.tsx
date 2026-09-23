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
  useLocation: () => () => ({ pathname: "/courses", search: {}, searchStr: "", hash: "" }),
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
}));
vi.mock("@/api/reports", () => ({ getMyCourses }));
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
        class_course_count: 2,
        course_membership_count: 0,
        creator: { id: "teacher-1", username: "teacher", display_name: "Ada Teacher" },
      },
      {
        id: "study-1",
        title: "Study Lab",
        description: "Weekly review",
        kind: "study",
        class_course_count: 0,
        course_membership_count: 5,
        creator: { id: "teacher-1", username: "teacher", display_name: "Ada Teacher" },
      },
      {
        id: "club-1",
        title: "Robotics",
        description: "Build robots",
        kind: "club",
        class_course_count: 1,
        course_membership_count: 9,
        creator: { id: "teacher-2", username: "mentor", display_name: "Club Mentor" },
      },
    ],
    total: 3,
    limit: 3,
    offset: 0,
  });

  render(() => <PreferencesProvider><CoursesPage /></PreferencesProvider>);

  expect(await screen.findByRole("button", { name: /^Algebra/ })).toBeTruthy();
  expect(screen.getAllByText("Enrolled")).toHaveLength(3);
  expect(getMyCourses).toHaveBeenCalledWith();
  expect(getCourses).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("tab", { name: "Study" }));
  expect(await screen.findByRole("button", { name: /^Study Lab/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Algebra/ })).toBeNull();
  expect(getMyCourses).toHaveBeenCalledTimes(1);
  const tabNavigation = navigate.mock.calls.at(-1)?.[0] as { to: string; replace: boolean; search: (prev: Record<string, unknown>) => Record<string, unknown> };
  expect(tabNavigation.to).toBe("/courses");
  expect(tabNavigation.replace).toBe(true);
  // The kind tab keeps the search text and restarts paging.
  expect(tabNavigation.search({ q: "alg", page: 3, action: "new" })).toEqual({ q: "alg", taught: undefined, sort: undefined, action: undefined, kind: "study", page: undefined });

  fireEvent.click(screen.getByRole("tab", { name: "Club" }));
  expect(await screen.findByRole("button", { name: /^Robotics/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Study Lab/ })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "Classes" }));
  expect(await screen.findByRole("button", { name: /^Algebra/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Robotics/ })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "robot" } });
  await waitFor(() => expect(screen.getByRole("button", { name: /^Robotics/ })).toBeTruthy());
  expect(screen.queryByRole("button", { name: /^Algebra/ })).toBeNull();

  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "" } });
  fireEvent.pointerDown(screen.getByRole("button", { name: /Section:/ }), { button: 0, pointerType: "mouse" });
  const untaught = await screen.findByRole("menuitem", { name: "No sections" });
  fireEvent.pointerDown(untaught, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(untaught, { button: 0, pointerType: "mouse" });
  fireEvent.click(untaught);
  expect(await screen.findByRole("button", { name: /^Study Lab/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Robotics/ })).toBeNull();
});
