import {
  type Accessor,
  type ParentProps,
  createContext,
  createMemo,
  createResource,
  createSignal,
  useContext,
} from "solid-js";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getAppointments } from "@/api/appointments";
import { getMessages } from "@/api/messages";
import type { Appointment, Event, Exam, Homework, Message, Page } from "@/api/client";
import { createLivePoll } from "@/lib/create-live-poll";
import { useAuth } from "@/stores/auth-context";

// One shared poller for the always-mounted shell (NotificationCenter header +
// RightNav sidebar). Both used to `createResource` messages/events/exams
// independently — ~8 GETs/min. This fetches the widest form of each source
// ONCE; both consumers derive their own views locally.
//
// Every accessor returns `resource.latest`, not `resource()`: these feed
// always-rendered badges/counts OUTSIDE any <Suspense> (beside <Outlet>). A
// bare read re-suspends on every 60s refetch and blanks the whole page for the
// fetch duration (AGENTS.md #6). `.latest` + `initialValue` never suspends.

type ShellFeedContextValue = {
  messages: Accessor<Page<Message>>;
  /** Newest unread inbox rows; `.total` is the *exact* server-side unread count. */
  unreadMessages: Accessor<Page<Message>>;
  events: Accessor<Page<Event>>;
  exams: Accessor<Page<Exam>>;
  appointments: Accessor<Page<Appointment>>;
  homework: Accessor<Page<Homework>>;
  nowMs: Accessor<number>;
  refetchMessages: () => void;
  refetchEvents: () => void;
  refetchExams: () => void;
  refetchAppointments: () => void;
  refetchHomework: () => void;
  refreshAll: () => void;
};

const ShellFeedContext = createContext<ShellFeedContextValue>();

const emptyPage = <T,>(): Page<T> => ({ items: [], total: 0, limit: null, offset: 0 });

type UserFeed = Omit<ShellFeedContextValue, "nowMs">;

// Everything user-scoped lives here so it can be created per account id and
// disposed with it (see ShellFeedProvider): a logged-out or switched account
// gets brand-new resources seeded with empty pages, so no previous user's rows
// can survive into the next session. Solid keeps a resource's last value when
// its source goes falsy, so gating alone would leak user A's inbox into user
// B's shell until the refetch resolved.
function createUserFeed(loggedIn: boolean): UserFeed {
  // Only fetch for a logged-in user: source is false while logged out, so the
  // resource keeps its seeded empty value and never hits the network.
  const source = () => loggedIn;

  const [messagesRes, { refetch: refetchInbox }] = createResource(
    source,
    async () => {
      try {
        return await getMessages("inbox", { limit: 100 });
      } catch {
        return emptyPage<Message>();
      }
    },
    { initialValue: emptyPage<Message>() }
  );

  // The badge cannot be derived from the inbox page above: that page is
  // ORDER BY id DESC capped at 100, so an old unread message falls off it.
  // `read=false` makes `total` the exact server-side unread count, and the 10
  // items are the newest unread ones the popover lists.
  const [unreadRes, { refetch: refetchUnread }] = createResource(
    source,
    async () => {
      try {
        return await getMessages("inbox", { read: false, limit: 10 });
      } catch {
        return emptyPage<Message>();
      }
    },
    { initialValue: emptyPage<Message>() }
  );

  // `ends_after=now` keeps only rows whose window has not finished AND flips
  // the server order to soonest-first, so a cap finally truncates the archive
  // end instead of the upcoming end. Without it the whole school history rode
  // along (~3.4 MB/poll at 5k+5k rows) only to be filtered out client-side.
  //
  // 50: the feed drives "upcoming" badges and the calendar dot — it needs the
  // next handful, not the archive. 50 soonest-first rows cover a busy month
  // per source. Both consumers already show only not-yet-ended items, so the
  // dropped rows were never rendered.
  // ponytail: a school with >50 simultaneously-open events loses the tail —
  // upgrade path is narrowing the window (add an upper bound), not a bigger cap.
  const upcoming = () => ({ ends_after: Date.now(), limit: 50 });

  const [eventsRes, { refetch: refetchEvents }] = createResource(
    source,
    async () => {
      try {
        return await getEvents(upcoming());
      } catch {
        return emptyPage<Event>();
      }
    },
    { initialValue: emptyPage<Event>() }
  );

  const [examsRes, { refetch: refetchExams }] = createResource(
    source,
    async () => {
      try {
        return await getExams(upcoming());
      } catch {
        return emptyPage<Exam>();
      }
    },
    { initialValue: emptyPage<Exam>() }
  );

  const [appointmentsRes, { refetch: refetchAppointments }] = createResource(
    source,
    async () => {
      try {
        return await getAppointments({ limit: 100 });
      } catch {
        return emptyPage<Appointment>();
      }
    },
    { initialValue: emptyPage<Appointment>() }
  );

  const [homeworkRes, { refetch: refetchHomework }] = createResource(
    source,
    async () => {
      try {
        return await getHomework();
      } catch {
        return emptyPage<Homework>();
      }
    },
    { initialValue: emptyPage<Homework>() }
  );

  // One call refreshes both message views — marking a message read changes the
  // preview list and the unread count together.
  const refetchMessages = () => {
    void refetchInbox();
    void refetchUnread();
  };

  const refreshAll = () => {
    refetchMessages();
    void refetchEvents();
    void refetchExams();
    void refetchAppointments();
    void refetchHomework();
  };

  return {
    messages: () => messagesRes.latest,
    unreadMessages: () => unreadRes.latest,
    events: () => eventsRes.latest,
    exams: () => examsRes.latest,
    appointments: () => appointmentsRes.latest,
    homework: () => homeworkRes.latest,
    refetchMessages,
    refetchEvents: () => void refetchEvents(),
    refetchExams: () => void refetchExams(),
    refetchAppointments: () => void refetchAppointments(),
    refetchHomework: () => void refetchHomework(),
    refreshAll,
  };
}

export function ShellFeedProvider(props: ParentProps) {
  const auth = useAuth();
  // Keyed on the account id: logging out (null) or switching account disposes
  // the whole feed and builds a fresh one. Children never remount, so the
  // router tree below is untouched.
  const userId = createMemo(() => auth.user()?.id ?? null);
  const feed = createMemo(() => createUserFeed(userId() !== null));

  // Reactive clock so passed items drop off without a remount. Visibility-aware:
  // no ticks/GETs while the tab is hidden, refetch on tab-back so nothing is
  // stale on a parked tab. This is the single shell poller — it outlives the
  // per-user feeds and always drives the current one.
  const [nowMs, setNowMs] = createSignal(Date.now());
  createLivePoll(() => {
    if (!auth.user()) return;
    setNowMs(Date.now());
    feed().refreshAll();
  }, 60_000);

  const value: ShellFeedContextValue = {
    messages: () => feed().messages(),
    unreadMessages: () => feed().unreadMessages(),
    events: () => feed().events(),
    exams: () => feed().exams(),
    appointments: () => feed().appointments(),
    homework: () => feed().homework(),
    nowMs,
    refetchMessages: () => feed().refetchMessages(),
    refetchEvents: () => feed().refetchEvents(),
    refetchExams: () => feed().refetchExams(),
    refetchAppointments: () => feed().refetchAppointments(),
    refetchHomework: () => feed().refetchHomework(),
    refreshAll: () => feed().refreshAll(),
  };

  return <ShellFeedContext.Provider value={value}>{props.children}</ShellFeedContext.Provider>;
}

export function useShellFeed(): ShellFeedContextValue {
  const ctx = useContext(ShellFeedContext);
  if (!ctx) throw new Error("useShellFeed must be used within ShellFeedProvider");
  return ctx;
}
