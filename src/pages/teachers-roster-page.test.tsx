import { cleanup, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, expect, test, vi } from "vitest";
import TeachersRosterPage from "./teachers-roster-page";
import { resetInstanceLabelCache } from "@/lib/instance-labels";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getClasses, getClassInstances, getUserSearch, getCourses } = vi.hoisted(() => ({
  getClasses: vi.fn(), getClassInstances: vi.fn(), getUserSearch: vi.fn(), getCourses: vi.fn(),
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element }) => <a href={props.to}>{props.children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/management/teachers", search: {}, searchStr: "", hash: "" }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "admin", role: "manager" }), loading: () => false, error: () => null }),
}));
vi.mock("@/api/classes", () => ({ getClasses, getClassInstances }));
vi.mock("@/api/users", () => ({ getUserSearch }));
vi.mock("@/api/courses", () => ({ getCourses }));

afterEach(() => {
  cleanup();
  resetInstanceLabelCache();
  vi.clearAllMocks();
});

test("shows teachers before the class list and fills both columns as reads finish", async () => {
  let resolveClasses!: (value: unknown) => void;
  let resolveInstances!: (value: unknown) => void;
  getUserSearch.mockResolvedValue({ items: [{ id: "t1", username: "teacher", display_name: "Ayşe" }] });
  getClasses.mockImplementation(() => new Promise((resolve) => { resolveClasses = resolve; }));
  getClassInstances.mockImplementation(() => new Promise((resolve) => { resolveInstances = resolve; }));

  render(() => <PreferencesProvider><TeachersRosterPage /></PreferencesProvider>);

  expect(await screen.findByText("Ayşe")).toBeTruthy();
  expect(screen.getAllByLabelText("Loading…")).toHaveLength(2);
  expect(getClasses).toHaveBeenCalledTimes(1);
  expect(getClassInstances).not.toHaveBeenCalled();

  resolveClasses({ items: [{ id: "c1", name: "9-A", grade_level: 9, teacher: { id: "t1" } }] });
  expect(await screen.findByText("9-A")).toBeTruthy();
  await waitFor(() => expect(getClassInstances).toHaveBeenCalledTimes(1));
  expect(screen.getAllByLabelText("Loading…")).toHaveLength(1);

  resolveInstances({ items: [{ id: "i1", course: "math", title: "Advanced Math", teachers: [{ id: "t1" }] }] });
  expect(await screen.findByText("Advanced Math — 9-A")).toBeTruthy();
  expect(getCourses).not.toHaveBeenCalled();
});

test("does not walk classes when the teacher list is empty", async () => {
  getUserSearch.mockResolvedValue({ items: [] });

  render(() => <PreferencesProvider><TeachersRosterPage /></PreferencesProvider>);

  expect(await screen.findByText("No teachers yet.")).toBeTruthy();
  expect(getClasses).not.toHaveBeenCalled();
  expect(getClassInstances).not.toHaveBeenCalled();
  expect(getCourses).not.toHaveBeenCalled();
});
