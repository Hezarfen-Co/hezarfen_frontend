import {
  type Accessor,
  type ParentProps,
  createContext,
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

export function ShellFeedProvider(props: ParentProps) {
  const auth = useAuth();
  // Only fetch for a logged-in user: source is falsy while logged out, so the
  // resource keeps its seeded empty value and never hits the network.
  const source = () => !!auth.user();

  const [messagesRes, { refetch: refetchMessages }] = createResource(
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

  const [eventsRes, { refetch: refetchEvents }] = createResource(
    source,
    async () => {
      try {
        return await getEvents({ limit: 100 });
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
        return await getExams({ limit: 100 });
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

  const refreshAll = () => {
    void refetchMessages();
    void refetchEvents();
    void refetchExams();
    void refetchAppointments();
    void refetchHomework();
  };

  // Reactive clock so passed items drop off without a remount. Visibility-aware:
  // no ticks/GETs while the tab is hidden, refetch on tab-back so nothing is
  // stale on a parked tab. This is the single shell poller.
  const [nowMs, setNowMs] = createSignal(Date.now());
  createLivePoll(() => {
    if (!auth.user()) return;
    setNowMs(Date.now());
    refreshAll();
  }, 60_000);

  const value: ShellFeedContextValue = {
    messages: () => messagesRes.latest,
    events: () => eventsRes.latest,
    exams: () => examsRes.latest,
    appointments: () => appointmentsRes.latest,
    homework: () => homeworkRes.latest,
    nowMs,
    refetchMessages: () => void refetchMessages(),
    refetchEvents: () => void refetchEvents(),
    refetchExams: () => void refetchExams(),
    refetchAppointments: () => void refetchAppointments(),
    refetchHomework: () => void refetchHomework(),
    refreshAll,
  };

  return <ShellFeedContext.Provider value={value}>{props.children}</ShellFeedContext.Provider>;
}

export function useShellFeed(): ShellFeedContextValue {
  const ctx = useContext(ShellFeedContext);
  if (!ctx) throw new Error("useShellFeed must be used within ShellFeedProvider");
  return ctx;
}
