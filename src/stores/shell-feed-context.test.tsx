import { render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import type { User } from "@/api/client";
import { ShellFeedProvider, useShellFeed } from "@/stores/shell-feed-context";

// The provider only reads `auth.user()`; drive it from a signal the test owns.
const [user, setUser] = createSignal<User | null>(null);
vi.mock("@/stores/auth-context", () => ({ useAuth: () => ({ user }) }));

const page = <T,>(items: T[]) => ({ items, total: items.length, limit: null, offset: 0 });

// Message previews are the account-scoped payload under test; the rest stay empty.
vi.mock("@/api/messages", () => ({
  getMessages: async () => page([{ id: `${user()?.id}-msg`, read: false }]),
}));
vi.mock("@/api/events", () => ({ getEvents: async () => page([]) }));
vi.mock("@/api/exams", () => ({ getExams: async () => page([]) }));
vi.mock("@/api/appointments", () => ({ getAppointments: async () => page([]) }));
vi.mock("@/api/homework", () => ({ getHomework: async () => page([]) }));

const as = (id: string) => ({ id }) as User;

function Probe() {
  const feed = useShellFeed();
  return <span data-testid="ids">{feed.messages().items.map((m) => m.id).join(",")}</span>;
}

test("logout clears the feed and login as another user never shows the previous one's rows", async () => {
  setUser(as("alice"));
  const { getByTestId } = render(() => (
    <ShellFeedProvider>
      <Probe />
    </ShellFeedProvider>
  ));
  await waitFor(() => expect(getByTestId("ids").textContent).toBe("alice-msg"));

  setUser(null);
  expect(getByTestId("ids").textContent).toBe(""); // no leftover value after logout

  setUser(as("bob"));
  expect(getByTestId("ids").textContent).toBe(""); // and none while bob's fetch is in flight
  await waitFor(() => expect(getByTestId("ids").textContent).toBe("bob-msg"));
});

test("no fetch fires while logged out", async () => {
  const messages = await import("@/api/messages");
  const spy = vi.spyOn(messages, "getMessages");
  setUser(null);
  render(() => (
    <ShellFeedProvider>
      <Probe />
    </ShellFeedProvider>
  ));
  await Promise.resolve();
  expect(spy).not.toHaveBeenCalled();
});

afterEach(() => {
  setUser(null);
  vi.restoreAllMocks();
});
