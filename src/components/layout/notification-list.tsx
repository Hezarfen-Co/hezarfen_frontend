import { For, Show, Suspense, createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { ComingSoonPanel } from "@/components/ui/coming-soon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { NotificationItem, NotificationType } from "@/lib/notifications";
import type { NotificationFeed } from "@/components/layout/notification-feed";
import { useT } from "@/stores/preferences-context";

/**
 * The notification list — header with "clear all", grouped rows, and the
 * preview of one row — for whichever surface hosts it. The preview is local
 * state, so it resets whenever the host unmounts the list on close.
 */
export function NotificationList(props: {
  feed: NotificationFeed;
  /** Leaves the target page of a previewed notification. */
  onNavigate: (url: string) => void;
  /** The host already names the list (a panel title). */
  showTitle?: boolean;
  /** Height cap of the scrolling list; the popover keeps it short. */
  scrollClass?: string;
}) {
  const t = useT();
  const [previewNotification, setPreviewNotification] = createSignal<NotificationItem | null>(null);
  // Clearing everything cannot be undone, so it asks first.
  const [confirmClear, setConfirmClear] = createSignal(false);
  const totalCount = () => props.feed.groups().reduce((count, group) => count + group.items.length, 0);

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

  const dismissOne = (evt: MouseEvent, id: string) => {
    evt.stopPropagation();
    props.feed.dismiss(id);
  };

  const select = async (item: NotificationItem) => {
    await props.feed.markRead(item);
    setPreviewNotification(item);
  };

  const goTo = () => {
    const item = previewNotification();
    if (!item) return;
    setPreviewNotification(null);
    props.onNavigate(item.targetUrl);
  };

  return (
    <>
      {/* Hosted under a panel title, the header row only earns its place when
          there is something to clear. */}
      <Show when={(props.showTitle ?? true) || props.feed.unreadCount() > 0}>
        <div class="flex items-center justify-between border-b border-border-hairline px-4 py-3">
          <div class="flex items-center gap-2">
            <Show when={props.showTitle ?? true}>
              <h3 class="text-sm font-semibold text-text-strong">{t("notifications.title")}</h3>
            </Show>
            <Show when={props.feed.unreadCount() > 0}>
              <span class="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary-text">
                {props.feed.unreadCount()}
              </span>
            </Show>
          </div>

          <Show when={props.feed.unreadCount() > 0}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 rounded-lg px-2 text-[11px] font-semibold text-text-subtle hover:bg-destructive/10 hover:text-destructive-text"
              onClick={() => setConfirmClear(true)}
              title={t("notifications.clearAll")}
            >
              <IconTrash class="mr-1 h-3 w-3" />
              {t("notifications.clearAll")}
            </Button>
          </Show>
        </div>
      </Show>

      <Show
        when={previewNotification()}
        fallback={
          <Tabs defaultValue="all" class="p-2">
        <TabsList class="mx-auto mb-2 h-8 w-fit min-w-[180px] p-0.5">
          <TabsTrigger value="all" class="h-7 flex-1 px-3 text-[11px]">{t("notifications.tabAll")}</TabsTrigger>
          <TabsTrigger value="system" class="h-7 flex-1 px-3 text-[11px]">{t("notifications.tabSystem")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" class={cn("mt-0 space-y-1 overflow-y-auto", props.scrollClass ?? "max-h-80")}>
          <Suspense
            fallback={
              <div class="p-8 text-center text-xs text-text-subtle">
                {t("common.loading")}
              </div>
            }
          >
            <Show
              when={props.feed.groups().length > 0}
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
                <For each={props.feed.groups()}>
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
                              onClick={() => select(item)}
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

                              <div class="min-w-0 flex-1 space-y-0.5 pr-6 touch:pr-10">
                                <span class="block truncate font-semibold text-text-strong">
                                  {item.title}
                                </span>
                                <p class="line-clamp-2 text-[11px] leading-snug text-text-subtle">
                                  {item.description}
                                </p>
                              </div>

                              <button
                                type="button"
                                // A thumb-sized target on touch screens, where
                                // there is no hover to reveal it either.
                                class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-text-subtle/70 opacity-80 transition-all hover:bg-destructive/10 hover:text-destructive-text sm:opacity-0 sm:group-hover:opacity-100 touch:right-0 touch:top-0 touch:h-11 touch:w-11 touch:opacity-80"
                                title={t("notifications.dismiss")}
                                aria-label={t("notifications.dismiss")}
                                onClick={(e) => dismissOne(e, item.id)}
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

            <Button type="button" size="sm" class="w-full rounded-lg" onClick={goTo}>
              <IconExternalLink class="mr-1.5 h-3.5 w-3.5" />
              {t("notifications.goToPage")}
            </Button>
          </div>
        )}
      </Show>

      <ConfirmDialog
        open={confirmClear()}
        onOpenChange={setConfirmClear}
        title={t("notifications.clearAllConfirmTitle")}
        summary={t("notifications.clearAllConfirmSummary", { count: totalCount() })}
        confirmLabel={t("notifications.clearAll")}
        variant="destructive"
        onConfirm={() => props.feed.dismissAll()}
      />
    </>
  );
}
