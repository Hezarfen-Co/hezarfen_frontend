import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { patchMessageById } from "@/api/messages";
import { Button } from "@/components/ui/button";
import { ComingSoonPanel } from "@/components/ui/coming-soon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconBell,
  IconCalendar,
  IconChevronLeft,
  IconExam,
  IconExternalLink,
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
  getReadNotificationIds,
  markNotificationRead,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notifications";
import { usePreferences } from "@/stores/preferences-context";
import { useShellFeed } from "@/stores/shell-feed-context";

export function NotificationCenter() {
  const { t, locale } = usePreferences();
  const dateLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  const navigate = useNavigate();
  const feed = useShellFeed();
  const [open, setOpen] = createSignal(false);
  const [dismissedIds, setDismissedIds] = createSignal<Set<string>>(getDismissedNotificationIds());
  const [readIds, setReadIds] = createSignal<Set<string>>(getReadNotificationIds());
  const [previewNotification, setPreviewNotification] = createSignal<NotificationItem | null>(null);

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
          description: ex.starts_at
            ? new Date(ex.starts_at).toLocaleString(dateLocale(), {
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
            ? `${t("homework.dueAt")}: ${new Date(hw.due_at).toLocaleDateString(dateLocale(), {
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

  const isUnread = (item: NotificationItem) => !readIds().has(item.id);
  const unreadNotifications = createMemo(() => activeNotifications().filter(isUnread));

  const notificationGroupOrder: NotificationType[] = ["message", "event", "exam", "homework"];
  const notificationGroupLabel = (type: NotificationType) => {
    if (type === "message") return t("nav.messages");
    if (type === "event") return t("events.title");
    if (type === "exam") return t("exams.title");
    return t("homework.title");
  };
  const notificationGroupTone = (type: NotificationType) => {
    if (type === "message") return "border-primary/20 bg-primary/[0.035]";
    if (type === "event") return "border-violet-500/20 bg-violet-500/[0.035]";
    if (type === "exam") return "border-amber-500/25 bg-amber-500/[0.045]";
    return "border-emerald-500/20 bg-emerald-500/[0.035]";
  };
  const notificationGroupIconTone = (type: NotificationType) => {
    if (type === "message") return "bg-primary/10 text-primary-text";
    if (type === "event") return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    if (type === "exam") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  };
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
    if (isUnread(item)) {
      setReadIds(new Set(markNotificationRead(item.id)));
    }

    // Message notifications also need to be marked read in the backend.
    if (item.id.startsWith("msg_")) {
      const realId = item.id.replace("msg_", "");
      try {
        await patchMessageById(realId, { read: true });
        void refetchMessages();
      } catch {
        // ignore
      }
    }
    setPreviewNotification(item);
  };

  const handleNavigateToNotification = () => {
    const item = previewNotification();
    if (!item) return;
    setPreviewNotification(null);
    setOpen(false);
    void navigate({ to: item.targetUrl });
  };

  return (
    <Popover
      open={open()}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setPreviewNotification(null);
      }}
      placement="bottom-end"
      gutter={8}
    >
      <PopoverTrigger
        class={cn(
          "topbar-control relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          open() && "bg-muted text-foreground"
        )}
        title={t("notifications.title")}
        aria-label={t("notifications.title")}
      >
        <IconBell class="h-4 w-4" />
        <Show when={unreadCount() > 0}>
          <span class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
            {unreadCount() > 9 ? "9+" : unreadCount()}
          </span>
        </Show>
      </PopoverTrigger>

      <PopoverContent class="w-80 sm:w-96 rounded-xl border border-border-line bg-surface-base p-0 shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between border-b border-border-hairline px-4 py-3">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-text-strong">{t("notifications.title")}</h3>
            <Show when={unreadCount() > 0}>
              <span class="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary-text">
                {unreadCount()}
              </span>
            </Show>
          </div>

          <Show when={unreadCount() > 0}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 rounded-lg px-2 text-[11px] font-semibold text-text-subtle hover:bg-destructive/10 hover:text-destructive-text"
              onClick={handleDismissAll}
              title={t("notifications.clearAll")}
            >
              <IconTrash class="mr-1 h-3 w-3" />
              {t("notifications.clearAll")}
            </Button>
          </Show>
        </div>

        <Show
          when={previewNotification()}
          fallback={
            <Tabs defaultValue="all" class="p-2">
          <TabsList class="mx-auto mb-2 h-8 w-fit min-w-[180px] p-0.5">
            <TabsTrigger value="all" class="h-7 flex-1 px-3 text-[11px]">{t("notifications.tabAll")}</TabsTrigger>
            <TabsTrigger value="system" class="h-7 flex-1 px-3 text-[11px]">{t("notifications.tabSystem")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" class="mt-0 max-h-80 space-y-1 overflow-y-auto">
            <Suspense
              fallback={
                <div class="p-8 text-center text-xs text-text-subtle">
                  {t("common.loading")}
                </div>
              }
            >
              <Show
                when={notificationGroups().length > 0}
                fallback={
                  <div class="space-y-2 p-8 text-center">
                    <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-tint text-text-subtle">
                      <IconBell class="h-5 w-5" />
                    </div>
                    <p class="text-xs font-medium text-text-subtle">
                      {t("notifications.empty")}
                    </p>
                  </div>
                }
              >
                <div class="space-y-2">
                  <For each={notificationGroups()}>
                    {(group) => (
                      <section class={cn("overflow-hidden rounded-xl border", notificationGroupTone(group.type))}>
                        <div class="flex items-center justify-between gap-2 px-2.5 py-2">
                          <div class="flex min-w-0 items-center gap-2">
                            <div class={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", notificationGroupIconTone(group.type))}>
                              <Show when={group.type === "message"}>
                                <IconMessage class="h-3.5 w-3.5" />
                              </Show>
                              <Show when={group.type === "event"}>
                                <IconCalendar class="h-3.5 w-3.5" />
                              </Show>
                              <Show when={group.type === "exam"}>
                                <IconExam class="h-3.5 w-3.5" />
                              </Show>
                              <Show when={group.type === "homework"}>
                                <IconHomework class="h-3.5 w-3.5" />
                              </Show>
                            </div>
                            <span class="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-text-subtle">
                              {notificationGroupLabel(group.type)}
                            </span>
                          </div>
                          <span class="shrink-0 rounded-full bg-background/70 px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-subtle">
                            {group.items.length}
                          </span>
                        </div>

                        <div class="space-y-0.5 px-1 pb-1">
                          <For each={group.items}>
                            {(item) => (
                              <div
                                onClick={() => handleSelectNotification(item)}
                                class="group relative flex cursor-pointer select-none items-start gap-3 rounded-lg p-2 text-xs transition-colors hover:bg-background/70"
                              >
                                <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/75 text-text-subtle transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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

                                <div class="min-w-0 flex-1 space-y-0.5 pr-6">
                                  <span class="block truncate font-semibold text-text-strong">
                                    {item.title}
                                  </span>
                                  <p class="line-clamp-2 text-[11px] leading-snug text-text-subtle">
                                    {item.description}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-text-subtle/70 opacity-80 transition-all hover:bg-destructive/10 hover:text-destructive-text sm:opacity-0 sm:group-hover:opacity-100"
                                  title={t("notifications.dismiss")}
                                  onClick={(e) => handleDismissSingle(e, item.id)}
                                >
                                  <IconX class="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </For>
                        </div>
                      </section>
                    )}
                  </For>
                </div>
              </Show>
            </Suspense>
          </TabsContent>

              <TabsContent value="system" class="mt-0">
                <ComingSoonPanel title={t("notifications.tabSystem")} class="border-0 p-3" />
              </TabsContent>
            </Tabs>
          }
        >
          {(item) => (
            <div class="space-y-4 p-4">
              <div class="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-7 rounded-lg px-2 text-[11px] text-text-subtle"
                  onClick={() => setPreviewNotification(null)}
                >
                  <IconChevronLeft class="mr-1 h-3.5 w-3.5" />
                  {t("common.back")}
                </Button>
              </div>

              <div class="space-y-2">
                <div class="flex items-start gap-3">
                  <div class={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", notificationGroupIconTone(item().type))}>
                    <Show when={item().type === "message"}>
                      <IconMessage class="h-5 w-5" />
                    </Show>
                    <Show when={item().type === "event"}>
                      <IconCalendar class="h-5 w-5" />
                    </Show>
                    <Show when={item().type === "exam"}>
                      <IconExam class="h-5 w-5" />
                    </Show>
                    <Show when={item().type === "homework"}>
                      <IconHomework class="h-5 w-5" />
                    </Show>
                  </div>
                  <div class="min-w-0 space-y-1">
                    <h4 class="text-sm font-semibold leading-snug text-text-strong">{item().title}</h4>
                    <p class="whitespace-pre-line text-xs leading-relaxed text-text-subtle">
                      {item().preview ?? item().description}
                    </p>
                  </div>
                </div>
              </div>

              <Button type="button" size="sm" class="w-full rounded-lg" onClick={handleNavigateToNotification}>
                <IconExternalLink class="mr-1.5 h-3.5 w-3.5" />
                {t("notifications.goToPage")}
              </Button>
            </div>
          )}
        </Show>
      </PopoverContent>
    </Popover>
  );
}
