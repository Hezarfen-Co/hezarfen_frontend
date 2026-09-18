import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import EventsPage from "@/pages/events-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getEvents } = vi.hoisted(() => ({ getEvents: vi.fn() }));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/events", searchStr: "" }),
}));
vi.mock("@/stores/auth-context", () => ({
  useAuth: () => ({
    user: () => ({ id: "student-1", username: "student", role: "student" }),
    loading: () => false,
    error: () => undefined,
  }),
}));
vi.mock("@/api/events", () => ({ getEvents, postEvent: vi.fn() }));
vi.mock("@/api/courses", () => ({ getCourses: vi.fn() }));
vi.mock("@/api/time", () => ({ getTime: vi.fn(async () => ({ now: Date.now() })) }));

const event = (n: number) => ({
  id: `event-${n}`,
  creator: "teacher-1",
  title: `Event ${n}`,
  description: "",
  audience: { kind: "school" },
  starts_at: null,
  ends_at: null,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("a capped event list says rows were left out and loads them on request", async () => {
  getEvents.mockImplementation(async (params?: { limit?: number }) => {
    const all = Array.from({ length: 3 }, (_, i) => event(i + 1));
    const items = params?.limit ? all.slice(0, 2) : all;
    return { items, total: all.length, limit: params?.limit ?? null, offset: 0 };
  });

  render(() => (
    <PreferencesProvider>
      <EventsPage />
    </PreferencesProvider>
  ));

  const notice = await screen.findByRole("status");
  expect(getEvents).toHaveBeenCalledWith({ limit: 100 });
  expect(notice.textContent).toContain("3");

  fireEvent.click(await screen.findByRole("button", { name: /Tümünü yükle|Load all/ }));

  await waitFor(() => expect(getEvents).toHaveBeenLastCalledWith(undefined));
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
});
