import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import CoursesPage from "@/pages/courses-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getCourses, navigate } = vi.hoisted(() => ({
  getCourses: vi.fn(),
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
vi.mock("@/api/limits", () => ({ getLimits: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const creator = { id: "teacher-1", username: "teacher", display_name: "Ada Teacher" };
const catalog = [
  { id: "course-1", title: "Algebra", description: "Core mathematics", kind: "course", class_course_count: 2, course_membership_count: 0, creator },
  { id: "study-1", title: "Study Lab", description: "Weekly review", kind: "study", class_course_count: 0, course_membership_count: 5, creator },
  {
    id: "club-1",
    title: "Robotics",
    description: "Build robots",
    kind: "club",
    class_course_count: 1,
    course_membership_count: 9,
    creator: { id: "teacher-2", username: "mentor", display_name: "Club Mentor" },
  },
];

// The mock plays server: `kind`, `q` and `taught` narrow the page, `total`
// counts what matched.
function serveCatalog() {
  getCourses.mockImplementation((params?: { kind?: string; q?: string; taught?: boolean; offset?: number }) => {
    const needle = params?.q?.toLowerCase();
    const items = catalog.filter(
      (course) =>
        (!params?.kind || course.kind === params.kind) &&
        (!needle || `${course.title} ${course.description}`.toLowerCase().includes(needle)) &&
        (params?.taught === undefined || (params.taught ? course.class_course_count > 0 : course.class_course_count === 0)),
    );
    return Promise.resolve({ items, total: items.length, limit: 10, offset: params?.offset ?? 0 });
  });
}

// GET /courses is scoped server-side: a student reads only what they take, and
// the kind tab / search box / sections dropdown narrow on the server — the
// table never filters.
test("student course list filters on the server via kind, q and taught", async () => {
  serveCatalog();
  render(() => <PreferencesProvider><CoursesPage /></PreferencesProvider>);

  expect(await screen.findByRole("button", { name: /^Algebra/ })).toBeTruthy();
  expect(screen.getAllByText("Enrolled")).toHaveLength(3);
  // Unset filters stay off the wire — no `kind`, no `q`, no `taught`, not even empty.
  const first = getCourses.mock.calls[0][0];
  expect(first).not.toHaveProperty("kind");
  expect(first).not.toHaveProperty("q");
  expect(first).not.toHaveProperty("taught");
  expect(first.offset).toBe(0);

  // The kind tab refetches with `kind` and resets the offset.
  fireEvent.click(screen.getByRole("tab", { name: "Study" }));
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0].kind).toBe("study"));
  expect(getCourses.mock.calls.at(-1)[0]).not.toHaveProperty("q");
  expect(getCourses.mock.calls.at(-1)[0].offset).toBe(0);
  await waitFor(() => expect(screen.queryByRole("button", { name: /^Algebra/ })).toBeNull());
  const tabNavigation = navigate.mock.calls.at(-1)?.[0] as { to: string; replace: boolean; search: (prev: Record<string, unknown>) => Record<string, unknown> };
  expect(tabNavigation.to).toBe("/courses");
  expect(tabNavigation.replace).toBe(true);
  // The kind tab keeps the search text and the sections choice, and restarts paging.
  expect(tabNavigation.search({ q: "alg", taught: "taught", page: 3, action: "new" })).toEqual({ q: "alg", taught: "taught", sort: undefined, action: undefined, kind: "study", page: undefined });

  fireEvent.click(screen.getByRole("tab", { name: "Club" }));
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0].kind).toBe("club"));
  expect(await screen.findByRole("button", { name: /^Robotics/ })).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "All" }));
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0]).not.toHaveProperty("kind"));
  expect(await screen.findByRole("button", { name: /^Algebra/ })).toBeTruthy();

  // The search box is the `q` param: trimmed, blank omitted, offset reset.
  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "  robots  " } });
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0].q).toBe("robots"), { timeout: 2000 });
  expect(getCourses.mock.calls.at(-1)[0].offset).toBe(0);
  await waitFor(() => expect(screen.queryByRole("button", { name: /^Algebra/ })).toBeNull());

  fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "   " } });
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0]).not.toHaveProperty("q"), { timeout: 2000 });
  expect(await screen.findByRole("button", { name: /^Algebra/ })).toBeTruthy();

  // The sections dropdown is the `taught` param: untaught sends taught=false
  // and resets the offset; the server then returns only courses with no şube.
  expect(screen.getByRole("button", { name: /Section:/ })).toBeTruthy();
  fireEvent.pointerDown(screen.getByRole("button", { name: /Section:/ }), { button: 0, pointerType: "mouse" });
  const untaught = await screen.findByRole("menuitem", { name: "No sections" });
  fireEvent.pointerDown(untaught, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(untaught, { button: 0, pointerType: "mouse" });
  fireEvent.click(untaught);
  await waitFor(() => expect(getCourses.mock.calls.at(-1)[0].taught).toBe(false));
  expect(getCourses.mock.calls.at(-1)[0].offset).toBe(0);
  expect(getCourses.mock.calls.at(-1)[0]).not.toHaveProperty("q");
  await waitFor(() => expect(screen.queryByRole("button", { name: /^Algebra/ })).toBeNull());
  expect(screen.queryByRole("button", { name: /^Robotics/ })).toBeNull();
});
