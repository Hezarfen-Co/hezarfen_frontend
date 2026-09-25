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

test("the event list reads every page instead of stopping at the first 100", async () => {
  const all = Array.from({ length: 150 }, (_, i) => event(i + 1));
  getEvents.mockImplementation(async (params?: { limit?: number; offset?: number }) => {
    const offset = params?.offset ?? 0;
    const items = all.slice(offset, offset + (params?.limit ?? all.length));
    return { items, total: all.length, limit: params?.limit ?? null, offset };
  });

  render(() => (
    <PreferencesProvider>
      <EventsPage />
    </PreferencesProvider>
  ));

  await waitFor(() => expect(getEvents).toHaveBeenCalledWith({ limit: 100, offset: 100 }));
  expect(getEvents).toHaveBeenCalledWith({ limit: 100, offset: 0 });
  expect(screen.queryByRole("button", { name: /Tümünü yükle|Load all/ })).toBeNull();
});
