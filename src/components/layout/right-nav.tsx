import { Show, createMemo } from "solid-js";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import type { Event, Exam } from "@/api/client";
import { IconCalendarDays, IconMessage } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";
import { useShellFeed } from "@/stores/shell-feed-context";

export function RightNav() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const feed = useShellFeed();

  const isMessagesActive = () => location().pathname === "/messages";
  const isCalendarActive = () => location().pathname === "/calendar";

  // Shell feed data comes from the shared poller (ShellFeedProvider), so
  // messages/events/exams are fetched once for the whole shell, not
  // independently here and in NotificationCenter.

  // Two rules ride on this one line:
  // 1. `.latest` (via the store accessor), never a bare `resource()`: this feeds
  //    the always-rendered badge outside any <Suspense>, and RightNav sits beside
  //    <Outlet> in AppShell, so a re-suspend blanks the whole page for the fetch.
  // 2. The dedicated `read=false` page's `total` — the exact server-side count,
  //    and the same source NotificationCenter reads. Deriving unread by filtering
  //    the general inbox page instead silently drops anything older than its
  //    newest 100 rows, and the two shell badges then disagree.
  const unreadCount = createMemo(() => feed.unreadMessages().total);

  // Reactive clock from the shared poller so passed items clear without a remount.
  const nowMs = feed.nowMs;

  // An item is still notifiable until it has ended (ends_at, else starts_at).
  const notEnded = (starts?: number | null, ends?: number | null) => {
    if (!starts) return false;
    const end = ends ?? starts;
    return end >= nowMs();
  };

  const activeEvents = createMemo(() => {
    return feed.events().items.filter((e: Event) => notEnded(e.starts_at, e.ends_at));
  });

  const activeExams = createMemo(() => {
    return feed.exams().items.filter((e: Exam) => !e.draft && notEnded(e.starts_at, e.ends_at));
  });

  const hasTodayEvents = createMemo(() => activeEvents().length > 0);
  const hasTodayExams = createMemo(() => activeExams().length > 0);

  const goTo = (path: string) => {
    void navigate({ to: path });
  };

  return (
    <>
      {/* Sticky Right Icon Bar */}
      <aside
        class="sticky top-0 z-30 hidden h-screen w-14 shrink-0 flex-col items-center justify-between border-l border-black/6 bg-sidebar py-3 text-sidebar-foreground dark:border-white/8 dark:bg-[#070707] dark:text-white lg:flex"
      >
        <div class="flex flex-col items-center gap-3">
          {/* Messages Icon Button - Direct Page Navigation */}
          <button
            type="button"
            onClick={() => goTo("/messages")}
            class={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              isMessagesActive()
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
            )}
            title={t("nav.messages")}
            aria-label={t("nav.messages")}
          >
            <IconMessage class="h-5 w-5" />
            <Show when={unreadCount() > 0}>
              <span
                class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-2xs ring-2 ring-sidebar dark:ring-[#070707]"
                title={`${unreadCount()} ${t("rightPanel.unreadBadge")}`}
              >
                {unreadCount() > 9 ? "9+" : unreadCount()}
              </span>
            </Show>
          </button>

          {/* Calendar Icon Button - Direct Page Navigation */}
          <button
            type="button"
            onClick={() => goTo("/calendar")}
            class={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              isCalendarActive()
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
            )}
            title={t("nav.calendar")}
            aria-label={t("nav.calendar")}
          >
            <IconCalendarDays class="h-5 w-5" />

            {/* Both Event and Exam: Overlapping Colored Dots */}
            <Show when={hasTodayEvents() && hasTodayExams()}>
              <div class="absolute -top-1 -right-1 z-10 flex items-center -space-x-1.5">
                <span
                  class="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-2xs"
                  title={t("nav.events")}
                />
                <span
                  class="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-2xs"
                  title={t("nav.exams")}
                />
              </div>
            </Show>

            {/* Only Event */}
            <Show when={hasTodayEvents() && !hasTodayExams()}>
              <span
                class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-2xs"
                title={t("nav.events")}
              />
            </Show>

            {/* Only Exam */}
            <Show when={hasTodayExams() && !hasTodayEvents()}>
              <span
                class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-2xs"
                title={t("nav.exams")}
              />
            </Show>
          </button>
        </div>

        <div class="flex flex-col items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      </aside>
    </>
  );
}
