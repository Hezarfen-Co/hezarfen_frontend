import { createSignal } from "solid-js";
import { fireEvent, render, screen, within } from "@solidjs/testing-library";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ShellMessagesButton } from "@/components/layout/shell-messages-button";
import { PreferencesProvider } from "@/stores/preferences-context";

// The shell feed is the single source of truth for both badges; the test drives
// it through signals so a refetch (new message arriving) is reproducible.
const h = vi.hoisted(() => ({ feed: null as never }));

vi.mock("@/stores/shell-feed-context", () => ({ useShellFeed: () => h.feed }));
vi.mock("@/stores/auth-context", () => ({ useAuth: () => ({ user: () => ({ id: "u-1" }) }) }));
vi.mock("@tanstack/solid-router", () => ({
  Link: (props: never) => <a href={(props as { to: string }).to}>{(props as { children: unknown }).children}</a>,
  useNavigate: () => () => undefined,
}));
// Kobalte's popover keeps its content unmounted in jsdom; the badge and the
// "dismiss all" button are the surfaces under test, so render both inline.
vi.mock("@/components/ui/popover", () => ({
  Popover: (props: never) => (props as { children: unknown }).children,
  PopoverTrigger: (props: never) => <div>{(props as { children: unknown }).children}</div>,
  PopoverContent: (props: never) => <div>{(props as { children: unknown }).children}</div>,
}));

const emptyPage = { items: [], total: 0, limit: null, offset: 0 };
const msg = (id: string) => ({
  id,
  sender: { id: "s", name: "Ada", surname: "L" },
  subject: `subject ${id}`,
  body: "",
  read: false,
  sent_at: 1,
});

function mountFeed(inbox: unknown[], unread: { items: unknown[]; total: number }) {
  const [messages, setMessages] = createSignal({ ...emptyPage, items: inbox, total: inbox.length });
  const [unreadMessages, setUnreadMessages] = createSignal({ ...emptyPage, ...unread });
  h.feed = {
    messages,
    unreadMessages,
    events: () => emptyPage,
    exams: () => emptyPage,
    appointments: () => emptyPage,
    homework: () => emptyPage,
    nowMs: () => Date.now(),
    refetchMessages: () => {},
    refreshAll: () => {},
  } as never;
  return { setMessages, setUnreadMessages };
}

const badges = () => Array.from(document.querySelectorAll("span.bg-destructive")).map((n) => n.textContent);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// DEFECT 1: shell message badge used to filter the capped `limit:100` inbox page, so an
// unread message that fell off that page was counted by one badge only.
test("both shell badges report the same unread count", () => {
  // 7 unread server-side, but only 2 of them are on the capped inbox page.
  mountFeed([msg("m6"), msg("m7")], { items: [msg("m3"), msg("m6"), msg("m7")], total: 7 });

  render(() => (
    <PreferencesProvider>
      <ShellMessagesButton />
      <NotificationCenter />
    </PreferencesProvider>
  ));

  expect(badges()).toEqual(["7", "7"]);
});

// DEFECT 2: unlisted unread ignored dismissal, so dismiss-all left the badge
// stuck at (total - listed) over an empty popover.
test("dismiss all clears the badge, a later message raises it again", async () => {
  const listed = Array.from({ length: 10 }, (_, i) => msg(`m${i}`));
  const { setUnreadMessages } = mountFeed([], { items: listed, total: 11 });

  render(() => (
    <PreferencesProvider>
      <NotificationCenter />
    </PreferencesProvider>
  ));

  expect(badges()).toEqual(["9+"]);

  // Clearing everything asks first; nothing is cleared until it is confirmed.
  fireEvent.click(screen.getByTitle("Clear all"));
  expect(badges()).toEqual(["9+"]);
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
  await vi.waitFor(() => expect(badges()).toEqual([]));

  // A genuinely new message pushes the oldest listed one off the page.
  setUnreadMessages({ ...emptyPage, items: [msg("new"), ...listed.slice(0, 9)], total: 12 });
  expect(badges()).toEqual(["1"]);
});
