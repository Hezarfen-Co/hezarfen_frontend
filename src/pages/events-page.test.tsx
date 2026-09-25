import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import EventsPage from "@/pages/events-page";
import { PreferencesProvider } from "@/stores/preferences-context";

const { getEvents, locationSearch } = vi.hoisted(() => ({
  getEvents: vi.fn(),
  locationSearch: { value: {} as Record<string, unknown> },
}));

vi.mock("@tanstack/solid-router", () => ({
  Link: (props: { to: string; children: JSX.Element; class?: string }) => <a href={props.to} class={props.class}>{props.children}</a>,
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/events", searchStr: "", search: locationSearch.value }),
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
  locationSearch.value = {};
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

test("the upcoming tab asks the server for rows whose window has not finished", async () => {
  locationSearch.value = { when: "upcoming" };
  getEvents.mockResolvedValue({ items: [event(1)], total: 1, limit: 100, offset: 0 });

  render(() => (
    <PreferencesProvider>
      <EventsPage />
    </PreferencesProvider>
  ));

  await waitFor(() => expect(getEvents).toHaveBeenCalled());
  // Exact key set: exactly one bound, no other window key, no `?key=` blank.
  expect(getEvents).toHaveBeenCalledWith({ limit: 100, offset: 0, ends_after: expect.any(Number) });
});

test("the past tab asks the server for rows that finished before now", async () => {
  locationSearch.value = { when: "past" };
  getEvents.mockResolvedValue({ items: [event(1)], total: 1, limit: 100, offset: 0 });

  render(() => (
    <PreferencesProvider>
      <EventsPage />
    </PreferencesProvider>
  ));

  await waitFor(() => expect(getEvents).toHaveBeenCalled());
  expect(getEvents).toHaveBeenCalledWith({ limit: 100, offset: 0, ends_before: expect.any(Number) });
});


