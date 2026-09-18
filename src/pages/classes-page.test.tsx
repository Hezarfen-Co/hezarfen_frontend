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
  getLimits: vi.fn(async () => ({ course: { max_class_name_len: 60, max_class_grade_len: 10 } })),
}));
vi.mock("@/api/courses", () => ({ getCourses }));
vi.mock("@/api/users", () => ({ getUserSearch: vi.fn(async () => ({ items: [] })) }));

const createdClass = { id: "c-new", creator: null, name: "9-A", grade: "9", year: null, teacher: null };

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
  expect(postClass).toHaveBeenCalledWith({ name: "9-A", grade: undefined, year: undefined, teacher_id: undefined });
});

test("a create whose blueprint left pairs behind holds the page until the report closes", async () => {
  postClass.mockResolvedValue({
    class: createdClass,
    skipped: [{ class: "c-new", class_name: "9-A", course: "k1", reason: "the class is already at its course ceiling" }],
    stocked_from: "9",
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
