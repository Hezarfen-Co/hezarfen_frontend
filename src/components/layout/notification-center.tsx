import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { patchMessageById } from "@/api/messages";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  IconBell,
  IconCalendar,
  IconExam,
  IconHomework,
  IconMessage,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import {
  dismissAllNotificationIds,
  dismissNotificationId,
  getDismissedNotificationIds,
  type NotificationItem,
} from "@/lib/notifications";
import { useT } from "@/stores/preferences-context";
import { useShellFeed } from "@/stores/shell-feed-context";

export function NotificationCenter() {
  const t = useT();
  const navigate = useNavigate();
  const feed = useShellFeed();
  const [open, setOpen] = createSignal(false);
  const [dismissedIds, setDismissedIds] = createSignal<Set<string>>(getDismissedNotificationIds());

  // Shell feed data comes from the shared poller (ShellFeedProvider): one fetch
  // per source for the whole shell instead of a duplicate set here. Every read
  // below is `feed.x()` which returns `resource.latest` — non-suspending on the
  // 60s refetch, so the unread badge (outside the popover's <Suspense>) never
  // blanks the page beside <Outlet> (AGENTS.md #6).
  const refetchMessages = feed.refetchMessages;
  const refreshAll = feed.refreshAll;
  const nowMs = feed.nowMs;

  createEffect(() => {
    if (open()) refreshAll();
  });

  // An item is still notifiable until it has ended (ends_at, else starts_at).
  const notEnded = (starts: number, ends?: number | null) => (ends ?? starts) >= nowMs();

  // Combine notification items
  const allNotifications = createMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 1. Unread messages — the dedicated `read=false` page from the shell feed.
    // Never filter the shared inbox page instead: it is capped and ordered by
    // id DESC, so an older unread message is simply not in it.
    const msgs = feed.unreadMessages().items;
    for (const m of msgs) {
      list.push({
        id: `msg_${m.id}`,
        type: "message",
        title: personLabel(m.sender),
        description: m.subject || m.body.replace(/<[^>]*>?/gm, "").trim(),
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
            ? new Date(e.starts_at).toLocaleString([], {
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
          description: ex.starts_at
            ? new Date(ex.starts_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
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
          description: hw.due_at
            ? `${t("homework.dueAt")}: ${new Date(hw.due_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}`
            : "",
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
  const unreadCount = () => activeNotifications().length + unlistedUnread();

  const handleDismissSingle = (evt: MouseEvent, id: string) => {
    evt.stopPropagation();
    const updated = dismissNotificationId(id);
    setDismissedIds(new Set(updated));
  };

  const handleDismissAll = () => {
    const ids = activeNotifications().map((item) => item.id);
    const updated = dismissAllNotificationIds(ids);
    setDismissedIds(new Set(updated));
    setDismissedUnreadTotal(feed.unreadMessages().total);
  };

  const handleSelectNotification = async (item: NotificationItem) => {
    // If message notification, mark read in backend
    if (item.id.startsWith("msg_")) {
      const realId = item.id.replace("msg_", "");
      try {
        await patchMessageById(realId, { read: true });
        void refetchMessages();
      } catch {
        // ignore
      }
    }
    // Dismiss locally
    const updated = dismissNotificationId(item.id);
    setDismissedIds(new Set(updated));
    setOpen(false);
    void navigate({ to: item.targetUrl });
  };

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-end" gutter={8}>
      <PopoverTrigger
        class={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0 cursor-pointer outline-hidden",
          open() && "bg-secondary text-foreground"
        )}
        title={t("rightPanel.messagesTitle")}
        aria-label="Bildirimler"
      >
        <IconBell class="h-4 w-4" />
        <Show when={unreadCount() > 0}>
          <span class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-2xs ring-2 ring-background">
            {unreadCount() > 9 ? "9+" : unreadCount()}
          </span>
        </Show>
      </PopoverTrigger>

      <PopoverContent class="w-80 sm:w-96 rounded-2xl p-0 shadow-2xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div class="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/40">
          <div class="flex items-center gap-2">
            <IconBell class="h-4 w-4 text-primary" />
            <h3 class="text-xs font-bold text-foreground">Bildirimler</h3>
            <Show when={unreadCount() > 0}>
              <span class="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                {unreadCount()}
              </span>
            </Show>
          </div>

          <Show when={unreadCount() > 0}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={handleDismissAll}
              title="Tüm Bildirimleri Temizle"
            >
              <IconTrash class="mr-1 h-3 w-3" />
              Tümünü Sil
            </Button>
          </Show>
        </div>

        {/* Notifications List */}
        <div class="max-h-80 overflow-y-auto p-2 space-y-1">
          <Suspense
            fallback={
              <div class="p-8 text-center text-xs text-muted-foreground">
                {t("common.loading")}
              </div>
            }
          >
            <Show
              when={activeNotifications().length > 0}
              fallback={
                <div class="p-8 text-center space-y-2">
                  <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <IconBell class="h-5 w-5" />
                  </div>
                  <p class="text-xs font-medium text-muted-foreground">
                    Henüz yeni bir bildiriminiz yok.
                  </p>
                </div>
              }
            >
              <For each={activeNotifications()}>
                {(item) => (
                  <div
                    onClick={() => handleSelectNotification(item)}
                    class="group relative flex items-start gap-3 rounded-xl p-2.5 text-xs transition-colors cursor-pointer hover:bg-accent/60 select-none"
                  >
                    {/* Icon by Type */}
                    <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Show when={item.type === "message"}>
                        <IconMessage class="h-4 w-4" />
                      </Show>
                      <Show when={item.type === "event"}>
                        <IconCalendar class="h-4 w-4" />
                      </Show>
                      <Show when={item.type === "exam"}>
                        <IconExam class="h-4 w-4" />
                      </Show>
                      <Show when={item.type === "homework"}>
                        <IconHomework class="h-4 w-4" />
                      </Show>
                    </div>

                    {/* Content */}
                    <div class="min-w-0 flex-1 pr-6 space-y-0.5">
                      <div class="flex items-center justify-between gap-1">
                        <span class="truncate font-bold text-foreground">
                          {item.title}
                        </span>
                      </div>
                      <p class="line-clamp-2 text-[11px] text-muted-foreground leading-snug">
                        {item.description}
                      </p>
                    </div>

                    {/* Single Dismiss Button */}
                    <button
                      type="button"
                      class="absolute right-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      title="Sil"
                      onClick={(e) => handleDismissSingle(e, item.id)}
                    >
                      <IconX class="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </For>
            </Show>
          </Suspense>
        </div>
      </PopoverContent>
    </Popover>
  );
}
