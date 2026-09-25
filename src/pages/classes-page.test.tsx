import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, expect, test, vi } from "vitest";
import ClassesPage from "@/pages/classes-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getClasses, getClassMembers, postClass, getCourses, navigate } = vi.hoisted(() => ({
  getClasses: vi.fn(),
  getClassMembers: vi.fn(),
  postClass: vi.fn(),
  getCourses: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => navigate,
  useLocation: () => () => ({ pathname: "/management/classes", search: {}, searchStr: "", hash: "" }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "u-1", username: "boss", role: "manager" }),
    loading: () => false,
    error: () => null,
    refresh: vi.fn(),
  }),
}));
vi.mock("@/api/classes", () => ({ getClasses, getClassMembers, postClass }));
vi.mock("@/api/academic-years", () => ({ getAcademicYears: vi.fn(async () => ({ items: [] })) }));
vi.mock("@/api/limits", () => ({
  getLimits: vi.fn(async () => ({ course: { max_class_name_len: 60, min_grade_level: 0, max_grade_level: 12 } })),
}));
vi.mock("@/api/courses", () => ({ getCourses }));
vi.mock("@/api/users", () => ({ getUserSearch: vi.fn(async () => ({ items: [] })) }));

const createdClass = { id: "c-new", creator: null, name: "9-A", grade_level: 9, year: null, teacher: null };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openCreateForm() {
  getClasses.mockResolvedValue({ items: [] });
  getClassMembers.mockResolvedValue({ items: [], total: 0 });
  render(() => <PreferencesProvider><ClassesPage /></PreferencesProvider>);

  fireEvent.click(await screen.findByRole("button", { name: /New class/ }));
  fireEvent.input(await screen.findByLabelText(/^Name/), { target: { value: "9-A" } });
  fireEvent.change(document.getElementById("class-grade")!, { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

// The 201 is an envelope, not the class: opening the route with `undefined`
// 404s the class it just made.
test("creating a class opens the class the server made", async () => {
  postClass.mockResolvedValue({ class: createdClass, skipped: [], stocked_from: null });

  await openCreateForm();

  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({ to: "/management/classes/$id", params: { id: "c-new" } }),
  );
  expect(postClass).toHaveBeenCalledWith({ name: "9-A", grade_level: 9, year: undefined, teacher_id: undefined });
});

test("a create whose blueprint left pairs behind holds the page until the report closes", async () => {
  postClass.mockResolvedValue({
    class: createdClass,
    skipped: [{ class: "c-new", class_name: "9-A", course: "k1", reason: "the class is already at its course ceiling" }],
    stocked_from: 9,
  });
  getCourses.mockResolvedValue({ items: [{ id: "k1", title: "Algebra" }] });

  await openCreateForm();

  expect(await screen.findByText(/could not be attached/)).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "See details" }));
  expect(await screen.findByText("Not attached")).toBeTruthy();
  expect(await screen.findByText("Algebra")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({ to: "/management/classes/$id", params: { id: "c-new" } }),
  );
});

test("a blank class name is flagged under the field, not sent", async () => {
  getClasses.mockResolvedValue({ items: [] });
  render(() => <PreferencesProvider><ClassesPage /></PreferencesProvider>);

  fireEvent.click(await screen.findByRole("button", { name: /New class/ }));
  const field = await screen.findByLabelText(/^Name/);
  fireEvent.input(field, { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText(/This field is required|Bu alan zorunlu/)).toBeTruthy();
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.getAttribute("aria-describedby")).toBe("class-name-error");
  expect(postClass).not.toHaveBeenCalled();
});

// The grade dropdown's options come from their own unfiltered read: if they
// came from the table rows, picking a grade would collapse the option list to
// that one grade and there would be no way back.
test("the grade filter narrows on the server and keeps every option listed", async () => {
  const grade9 = { id: "c9", creator: null, name: "9-A", grade_level: 9, year: null, teacher: null };
  const grade10 = { id: "c10", creator: null, name: "10-A", grade_level: 10, year: null, teacher: null };
  // The table fetch narrows by grade_level; the dropdown's own read never does.
  getClasses.mockImplementation((params?: { grade_level?: number }) => {
    if (params?.grade_level != null) {
      const items = [grade9, grade10].filter((cls) => cls.grade_level === params.grade_level);
      return Promise.resolve({ items, total: items.length, limit: 200, offset: 0 });
    }
    return Promise.resolve({ items: [grade9, grade10], total: 2, limit: 200, offset: 0 });
  });
  getClassMembers.mockResolvedValue({ items: [], total: 0 });

  render(() => <PreferencesProvider><ClassesPage /></PreferencesProvider>);

  expect(await screen.findByRole("button", { name: /^9-A/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Grade:/ })).toBeTruthy();

  fireEvent.pointerDown(screen.getByRole("button", { name: /Grade:/ }), { button: 0, pointerType: "mouse" });
  const grade9Item = await screen.findByRole("menuitem", { name: "Grade 9" });
  fireEvent.pointerDown(grade9Item, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(grade9Item, { button: 0, pointerType: "mouse" });
  fireEvent.click(grade9Item);

  // The refetch carries `grade_level`; the unfiltered options read does not.
  await waitFor(() => expect(getClasses.mock.calls.at(-1)[0]).toEqual({ grade_level: 9 }));
  expect(getClasses.mock.calls.some((call) => call[0]?.grade_level === undefined && call[0]?.limit === 200)).toBe(true);
  expect(await screen.findByRole("button", { name: /^9-A/ })).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole("button", { name: /^10-A/ })).toBeNull());

  // Picking a grade must not erase the other options.
  fireEvent.pointerDown(screen.getByRole("button", { name: /Grade:/ }), { button: 0, pointerType: "mouse" });
  expect(await screen.findByRole("menuitem", { name: "Grade 10" })).toBeTruthy();
});
