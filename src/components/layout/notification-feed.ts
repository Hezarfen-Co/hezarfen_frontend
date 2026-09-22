import { createMemo, createSignal } from "solid-js";
import { patchMessageById } from "@/api/messages";
import { createInstanceLabels } from "@/lib/instance-labels";
import { personLabel } from "@/lib/person";
import {
  dismissAllNotificationIds,
  dismissNotificationId,
  getDismissedNotificationIds,
  getReadNotificationIds,
  markNotificationRead,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notifications";
import { useAuth } from "@/stores/auth-context";
import { usePreferences } from "@/stores/preferences-context";
import { useShellFeed } from "@/stores/shell-feed-context";

/**
 * The notification list and its read/dismissed state, apart from any chrome.
 * The desktop header shows it in a popover and the phone shell in a panel
 * opened from the floating action button; each mounts one of these, and the
 * shell mounts only one of the two at a time, so the dismissed state never
 * has two in-memory copies.
 */
export function createNotificationFeed() {
  const { t, locale } = usePreferences();
  const dateLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  const feed = useShellFeed();
  const [dismissedIds, setDismissedIds] = createSignal<Set<string>>(getDismissedNotificationIds());
  const [readIds, setReadIds] = createSignal<Set<string>>(getReadNotificationIds());

  // Shell feed data comes from the shared poller (ShellFeedProvider): one fetch
  // per source for the whole shell instead of a duplicate set here. Every read
  // below is `feed.x()` which returns `resource.latest` — non-suspending on the
  // 60s refetch, so the unread badge (outside the popover's <Suspense>) never
  // blanks the page beside <Outlet> (AGENTS.md #6).
  const nowMs = feed.nowMs;

  // An item is still notifiable until it has ended (ends_at, else starts_at).
  const notEnded = (starts: number, ends?: number | null) => (ends ?? starts) >= nowMs();

  // Exams and homework of one ders taught in two şubeler share titles; the
  // row's description names "<ders> — <şube>" so they can be told apart.
  const auth = useAuth();
  const sectionLabels = createInstanceLabels(
    () => [
      ...feed.exams().items.filter((ex) => ex.starts_at && !ex.draft && notEnded(ex.starts_at, ex.ends_at)).map((ex) => ex.class_course),
      ...feed.homework().items.filter((hw) => hw.due_at >= nowMs()).map((hw) => hw.class_course),
    ],
    () => auth.user()?.role,
  );
  const withSection = (instanceId: string, text: string) => {
    const label = sectionLabels()[instanceId]?.label;
    return label ? (text ? `${label} · ${text}` : label) : text;
  };

  // Combine notification items
  const allNotifications = createMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 1. Unread messages — the dedicated `read=false` page from the shell feed.
    // Never filter the shared inbox page instead: it is capped and ordered by
    // id DESC, so an older unread message is simply not in it.
    const msgs = feed.unreadMessages().items;
    for (const m of msgs) {
      const body = m.body.replace(/<[^>]*>?/gm, "").trim();
      list.push({
        id: `msg_${m.id}`,
        type: "message",
        title: personLabel(m.sender),
        description: m.subject || body,
        preview: m.subject ? `${m.subject}\n${body}` : body,
        targetUrl: "/messages",
        timestamp: m.sent_at,
      });
    }

    // 2. Events starting today or upcoming
    const evts = feed.events().items;
    for (const e of evts) {
      if (!e.starts_at) continue;
      const t = new Date(e.starts_at).getTime();
      if (notEnded(t, e.ends_at ? new Date(e.ends_at).getTime() : null)) {
        list.push({
          id: `evt_${e.id}`,
          type: "event",
          title: e.title,
          description: e.starts_at
            ? new Date(e.starts_at).toLocaleString(dateLocale(), {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          targetUrl: `/events/${e.id}`,
          timestamp: t,
        });
      }
    }

    // 3. Exams starting today or upcoming
    const exms = feed.exams().items;
    for (const ex of exms) {
      if (!ex.starts_at || ex.draft) continue;
      const t = new Date(ex.starts_at).getTime();
      if (notEnded(t, ex.ends_at ? new Date(ex.ends_at).getTime() : null)) {
        list.push({
          id: `ex_${ex.id}`,
          type: "exam",
          title: ex.title,
          description: withSection(
            ex.class_course,
            new Date(ex.starts_at).toLocaleString(dateLocale(), {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          ),
          targetUrl: `/exams/${ex.id}`,
          timestamp: t,
        });
      }
    }

    // 4. Homework due upcoming
    const hws = feed.homework().items;
    for (const hw of hws) {
      if (!hw.due_at) continue;
      if (hw.due_at >= nowMs()) {
        list.push({
          id: `hw_${hw.id}`,
          type: "homework",
          title: hw.title,
          description: withSection(
            hw.class_course,
            `${t("homework.dueAt")}: ${new Date(hw.due_at).toLocaleDateString(dateLocale(), {
              month: "short",
              day: "numeric",
            })}`,
          ),
          targetUrl: `/homework/${hw.id}`,
          timestamp: hw.due_at,
        });
      }
    }

    // Sort chronologically (newest/most relevant first)
    return list.sort((a, b) => b.timestamp - a.timestamp);
  });

  // Filter out dismissed notifications
  const activeNotifications = createMemo(() => {
    const dismissed = dismissedIds();
    return allNotifications().filter((item) => !dismissed.has(item.id));
  });

  const isUnread = (item: NotificationItem) => !readIds().has(item.id);
  const unreadNotifications = createMemo(() => activeNotifications().filter(isUnread));

  const notificationGroupOrder: NotificationType[] = ["message", "event", "exam", "homework"];
  const notificationGroups = createMemo(() =>
    notificationGroupOrder
      .map((type) => ({
        type,
        items: activeNotifications().filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0)
  );

  // The list only holds the newest 10 unread messages; `total` is the real
  // server-side unread count, so the rest still counts towards the badge.
  // Those extra rows have no id here, so they cannot be dismissed one by one:
  // "dismiss all" snapshots the unread total instead. Everything at or below the
  // snapshot counts as dismissed; anything above it arrived afterwards and still
  // raises the badge (minus the new rows already listed, which the active list
  // counts). Without the snapshot, 11 unread → dismiss all → badge stuck at 1
  // over an empty popover.
  // ponytail: the snapshot is in-memory while dismissed ids are persisted, so a
  // reload re-shows unlisted unread — upgrade path is storing it next to the ids
  // in `lib/notifications`.
  const [dismissedUnreadTotal, setDismissedUnreadTotal] = createSignal(0);
  const activeMessageCount = () => activeNotifications().filter((item) => item.type === "message").length;
  const unlistedUnread = () => {
    const page = feed.unreadMessages();
    const beyondPage = page.total - page.items.length;
    const sinceDismissAll = page.total - dismissedUnreadTotal() - activeMessageCount();
    return Math.max(0, Math.min(beyondPage, sinceDismissAll));
  };
  const unreadCount = () => unreadNotifications().length + unlistedUnread();

  const dismiss = (id: string) => {
    setDismissedIds(new Set(dismissNotificationId(id)));
  };

  const dismissAll = () => {
    const ids = activeNotifications().map((item) => item.id);
    setDismissedIds(new Set(dismissAllNotificationIds(ids)));
    setDismissedUnreadTotal(feed.unreadMessages().total);
  };

  const markRead = async (item: NotificationItem) => {
    if (isUnread(item)) {
      setReadIds(new Set(markNotificationRead(item.id)));
    }

    // Message notifications also need to be marked read in the backend.
    if (item.id.startsWith("msg_")) {
      const realId = item.id.replace("msg_", "");
      try {
        await patchMessageById(realId, { read: true });
        void feed.refetchMessages();
      } catch {
        // ignore
      }
    }
  };

  return {
    groups: notificationGroups,
    unreadCount,
    dismiss,
    dismissAll,
    markRead,
    refreshAll: feed.refreshAll,
  };
}

export type NotificationFeed = ReturnType<typeof createNotificationFeed>;
