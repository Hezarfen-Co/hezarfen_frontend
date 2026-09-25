import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import HomeworkPage from "@/pages/homework-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getHomework } = vi.hoisted(() => ({ getHomework: vi.fn() }));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/homework", search: {}, searchStr: "", hash: "" }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({ user: () => ({ id: "student-1", role: "student" }), loading: () => false, error: () => null }),
}));
vi.mock("@/lib/instance-options", () => ({ loadInstanceOptions: vi.fn(async () => []) }));
vi.mock("@/lib/instance-labels", () => ({ loadInstanceLabels: vi.fn(async () => new Map()) }));
vi.mock("@/api/homework", () => ({
  getHomework,
}));
vi.mock("@/api/time", () => ({ getTime: vi.fn(async () => ({ now: Date.now() })) }));
vi.mock("@/api/instances", () => ({ getInstanceSubjects: vi.fn(async () => ({ subjects: [] })), postInstanceHomework: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("homework filter renders before its list request finishes", async () => {
  getHomework.mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });
  render(() => <PreferencesProvider><HomeworkPage /></PreferencesProvider>);

  expect(await screen.findByRole("combobox", { name: /Courses|Dersler/ })).toBeTruthy();
});

test("past-due tab excludes future homework when the server ignores its date filter", async () => {
  const rows = [
    { id: "past", title: "Past assignment", due_at: Date.now() - 86_400_000, class_course: "i-1", assigned: [] },
    { id: "future", title: "Future assignment", due_at: Date.now() + 86_400_000, class_course: "i-1", assigned: [] },
  ];
  getHomework.mockResolvedValue({ items: rows, total: rows.length, limit: 100, offset: 0 });
  render(() => <PreferencesProvider><HomeworkPage /></PreferencesProvider>);

  expect(await screen.findByText("Future assignment")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: /Past due|Süresi geçen/ }));
  await waitFor(() => expect(screen.queryByText("Future assignment")).toBeNull());
  expect(screen.getByText("Past assignment")).toBeTruthy();
});
