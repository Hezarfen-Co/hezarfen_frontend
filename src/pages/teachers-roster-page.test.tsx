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

test("shows teachers while section reads are still pending", async () => {
  getUserSearch.mockResolvedValue({ items: [{ id: "t1", username: "teacher", display_name: "Ayşe" }] });
  getClasses.mockResolvedValue({ items: [{ id: "c1", name: "9-A", grade_level: 9, teacher: null }] });
  getCourses.mockResolvedValue({ items: [{ id: "math", title: "Math" }] });
  getClassInstances.mockImplementation(() => new Promise(() => {}));

  render(() => <PreferencesProvider><TeachersRosterPage /></PreferencesProvider>);

  expect(await screen.findByText("Ayşe")).toBeTruthy();
  await waitFor(() => expect(getClassInstances).toHaveBeenCalledTimes(1));
});
