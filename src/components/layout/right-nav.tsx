import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getMessages, patchMessageById } from "@/api/messages";
import type { Event, Exam, Message } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  IconCalendarDays,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconMessage,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

type ActiveTab = "messages" | "calendar" | null;
type CalendarItemRef = { type: "event"; data: Event } | { type: "exam"; data: Exam };

const PAGE_SIZE = 5;

export function RightNav() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = usePreferences();

  const isMessagesActive = () => location().pathname === "/messages";
  const isCalendarActive = () => location().pathname === "/calendar";

  // Active drawer tab
  const [activeTab, setActiveTab] = createSignal<ActiveTab>(null);

  // Messages drawer state
  const [unreadOnly, setUnreadOnly] = createSignal(false);
  const [selectedMessage, setSelectedMessage] = createSignal<Message | null>(null);

  // Calendar drawer state
  const [calPage, setCalPage] = createSignal(0);
  const [calFilter, setCalFilter] = createSignal<"all" | "events" | "exams">("all");
  const [selectedCalItem, setSelectedCalItem] = createSignal<CalendarItemRef | null>(null);

  // Fetch inbox messages
  const [messagesRes, { refetch: refetchMessages }] = createResource(
    async () => {
      try {
        return await getMessages("inbox", { limit: 100 });
      } catch {
        return { items: [], total: 0, limit: 100, offset: 0 };
      }
    },
    { initialValue: { items: [], total: 0, limit: 100, offset: 0 } }
  );

  // Fetch events & exams
  const [eventsRes] = createResource(
    async () => {
      try {
        return (await getEvents({ limit: 100 })).items;
      } catch {
        return [];
      }
    },
    { initialValue: [] }
  );

  const [examsRes] = createResource(
    async () => {
      try {
        return (await getExams({ limit: 100 })).items;
      } catch {
        return [];
      }
    },
    { initialValue: [] }
  );

  // Computed message data
  const allMessages = () => messagesRes().items;
  const unreadCount = createMemo(() => allMessages().filter((m: Message) => !m.read).length);

  const filteredMessages = createMemo(() => {
    let list = allMessages();
    if (unreadOnly()) {
      list = list.filter((m: Message) => !m.read);
    }
    return list;
  });

  // Top 5 recent messages only for side panel
  const recentMessages = createMemo(() => {
    return filteredMessages().slice(0, 5);
  });

  // Computed calendar data
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const activeEvents = createMemo(() => {
    return eventsRes().filter((e: Event) => {
      if (!e.starts_at) return false;
      return new Date(e.starts_at).getTime() >= startOfDay;
    });
  });

  const activeExams = createMemo(() => {
    return examsRes().filter((e: Exam) => {
      if (!e.starts_at || e.draft) return false;
      return new Date(e.starts_at).getTime() >= startOfDay;
    });
  });

  const hasTodayEvents = createMemo(() => activeEvents().length > 0);
  const hasTodayExams = createMemo(() => activeExams().length > 0);

  const combinedCalendarItems = createMemo(() => {
    const items: CalendarItemRef[] = [];

    if (calFilter() === "all" || calFilter() === "events") {
      for (const ev of activeEvents()) {
        items.push({ type: "event", data: ev });
      }
    }

    if (calFilter() === "all" || calFilter() === "exams") {
      for (const ex of activeExams()) {
        items.push({ type: "exam", data: ex });
      }
    }

    // Sort chronologically by start date
    return items.sort((a, b) => {
      const timeA = a.data.starts_at ? new Date(a.data.starts_at).getTime() : 0;
      const timeB = b.data.starts_at ? new Date(b.data.starts_at).getTime() : 0;
      return timeA - timeB;
    });
  });

  const calTotalPages = createMemo(() => Math.max(1, Math.ceil(combinedCalendarItems().length / PAGE_SIZE)));
  const paginatedCalItems = createMemo(() => {
    const start = calPage() * PAGE_SIZE;
    return combinedCalendarItems().slice(start, start + PAGE_SIZE);
  });

  const closePanel = () => {
    setActiveTab(null);
    setSelectedMessage(null);
    setSelectedCalItem(null);
  };

  const goTo = (path: string) => {
    closePanel();
    void navigate({ to: path });
  };

  // Mark message as read/unread toggle
  const toggleReadStatus = async (msg: Message) => {
    try {
      await patchMessageById(msg.id, { read: !msg.read });
      setSelectedMessage({ ...msg, read: !msg.read });
      void refetchMessages();
    } catch {
      // ignore
    }
  };

  // Mark as read if unread and navigate directly to /messages page
  const handleSelectMessage = async (msg: Message) => {
    if (!msg.read) {
      try {
        await patchMessageById(msg.id, { read: true });
        void refetchMessages();
      } catch {
        // ignore
      }
    }
    goTo("/messages");
  };

  return (
    <>
      {/* Sticky Right Icon Bar */}
      <aside
        class="sticky top-0 z-30 hidden h-screen w-14 shrink-0 flex-col items-center justify-between border-l border-black/[0.06] bg-sidebar py-3 text-sidebar-foreground dark:border-white/[0.08] dark:bg-[#070707] dark:text-white lg:flex"
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
                : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
            )}
            title={t("nav.messages")}
            aria-label={t("nav.messages")}
          >
            <IconMessage class="h-5 w-5" />
            <Show when={unreadCount() > 0}>
              <span
                class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs ring-2 ring-sidebar dark:ring-[#070707]"
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
                : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
            )}
            title={t("nav.calendar")}
            aria-label={t("nav.calendar")}
          >
            <IconCalendarDays class="h-5 w-5" />

            {/* Both Event and Exam: Overlapping Colored Dots */}
            <Show when={hasTodayEvents() && hasTodayExams()}>
              <div class="absolute -top-1 -right-1 z-10 flex items-center -space-x-1.5">
                <span
                  class="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-xs"
                  title={t("nav.events")}
                />
                <span
                  class="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-xs"
                  title={t("nav.exams")}
                />
              </div>
            </Show>

            {/* Only Event */}
            <Show when={hasTodayEvents() && !hasTodayExams()}>
              <span
                class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-xs"
                title={t("nav.events")}
              />
            </Show>

            {/* Only Exam */}
            <Show when={hasTodayExams() && !hasTodayEvents()}>
              <span
                class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-sidebar dark:ring-[#070707] shadow-xs"
                title={t("nav.exams")}
              />
            </Show>
          </button>
        </div>

        <div class="flex flex-col items-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      </aside>

      {/* Flyout Side Drawer Panel */}
      <Show when={activeTab() !== null}>
        {/* Backdrop overlay blurring main page content on the left */}
        <div
          class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all"
          onClick={closePanel}
        />

        <div
          class="fixed right-14 top-0 z-50 flex h-screen w-80 sm:w-96 flex-col border-l border-black/[0.08] bg-card text-card-foreground shadow-2xl dark:border-white/[0.08] dark:bg-[#0c0c0e] animate-in slide-in-from-right-4 duration-200"
        >
          {/* Drawer Header */}
          <div class="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
            <div class="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
              <Show when={activeTab() === "messages"}>
                <Show
                  when={selectedMessage()}
                  fallback={
                    <>
                      <IconMessage class="h-4 w-4 text-primary" />
                      <span>{t("rightPanel.messagesTitle")}</span>
                      <Show when={unreadCount() > 0}>
                        <Badge variant="destructive" class="ml-1.5 px-1.5 py-0 text-[10px]">
                          {unreadCount()} {t("rightPanel.unreadBadge")}
                        </Badge>
                      </Show>
                    </>
                  }
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs gap-1 rounded-lg hover:bg-secondary"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <IconChevronLeft class="h-3.5 w-3.5" />
                    <span>{t("common.back")}</span>
                  </Button>
                </Show>
              </Show>

              <Show when={activeTab() === "calendar"}>
                <Show
                  when={selectedCalItem()}
                  fallback={
                    <>
                      <IconCalendarDays class="h-4 w-4 text-primary" />
                      <span>{t("rightPanel.calendarTitle")}</span>
                    </>
                  }
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs gap-1 rounded-lg hover:bg-secondary"
                    onClick={() => setSelectedCalItem(null)}
                  >
                    <IconChevronLeft class="h-3.5 w-3.5" />
                    <span>{t("common.back")}</span>
                  </Button>
                </Show>
              </Show>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
              onClick={closePanel}
              aria-label={t("nav.close")}
            >
              <IconX class="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Body */}
          <div class="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {/* MESSAGES TAB */}
            <Show when={activeTab() === "messages"}>
              {/* Message Details Preview View */}
              <Show
                when={selectedMessage()}
                fallback={
                  /* Messages List View */
                  <Suspense fallback={<PageSpinner />}>
                    {/* Filter Bar */}
                    <div class="flex items-center justify-between gap-2 pb-1 border-b border-border/40 text-xs">
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setUnreadOnly(false)}
                          class={cn(
                            "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                            !unreadOnly()
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          {t("common.all")} ({allMessages().length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnreadOnly(true)}
                          class={cn(
                            "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                            unreadOnly()
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          {t("rightPanel.unreadBadge")} ({unreadCount()})
                        </button>
                      </div>
                    </div>

                    <Show
                      when={recentMessages().length > 0}
                      fallback={
                        <div class="flex h-48 flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                          <IconMessage class="h-8 w-8 text-muted-foreground/40" />
                          <p>{t("rightPanel.noUnread")}</p>
                        </div>
                      }
                    >
                      <div class="space-y-2">
                        <For each={recentMessages()}>
                          {(msg) => (
                            <div
                              onClick={() => handleSelectMessage(msg)}
                              class={cn(
                                "group flex cursor-pointer flex-col gap-1 rounded-xl border p-2.5 transition-all hover:border-primary/50 hover:bg-muted/40 shadow-2xs max-w-full overflow-hidden",
                                !msg.read
                                  ? "border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.06]"
                                  : "border-border/60 bg-card"
                              )}
                            >
                              <div class="flex items-center justify-between text-xs gap-2 min-w-0">
                                <div class="flex items-center gap-1.5 min-w-0 max-w-[70%]">
                                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                                    {personLabel(msg.sender).charAt(0).toUpperCase()}
                                  </span>
                                  <span class="font-semibold text-foreground truncate max-w-[140px]">
                                    {personLabel(msg.sender)}
                                  </span>
                                </div>
                                <span class="text-[10px] text-muted-foreground shrink-0">
                                  {msg.sent_at
                                    ? new Date(msg.sent_at).toLocaleTimeString(
                                        locale() === "tr" ? "tr-TR" : "en-US",
                                        { hour: "2-digit", minute: "2-digit" }
                                      )
                                    : ""}
                                </span>
                              </div>
                              <Show when={msg.subject}>
                                <p class="text-xs font-medium text-foreground truncate max-w-[280px]">
                                  {msg.subject}
                                </p>
                              </Show>
                              <p class="line-clamp-1 text-xs text-muted-foreground leading-relaxed truncate max-w-full">
                                {msg.body}
                              </p>
                              <div class="flex items-center justify-between pt-0.5 text-[10px]">
                                <Show when={!msg.read}>
                                  <span class="inline-flex items-center gap-1 font-semibold text-primary">
                                    <span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    {t("rightPanel.unreadBadge")}
                                  </span>
                                </Show>
                                <span class="text-muted-foreground/70 group-hover:text-primary transition-colors ml-auto font-medium">
                                  Mesaja Git →
                                </span>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>

                      {/* Redirect link for all messages if total > 5 */}
                      <Show when={filteredMessages().length > 5}>
                        <div class="pt-2 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="w-full h-8 text-xs text-primary border-primary/20 hover:bg-primary/5 rounded-lg justify-center gap-1.5 font-medium"
                            onClick={() => goTo("/messages")}
                          >
                            <span>Tüm Mesajları Aç ({filteredMessages().length})</span>
                            <IconExternalLink class="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Show>
                    </Show>
                  </Suspense>
                }
              >
                {(msg) => (
                  <div class="space-y-4 animate-in fade-in-50">
                    <div class="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
                      <div class="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                            {personLabel(msg().sender).charAt(0).toUpperCase()}
                          </span>
                          <div class="min-w-0">
                            <h4 class="text-xs font-semibold text-foreground truncate">
                              {personLabel(msg().sender)}
                            </h4>
                            <p class="text-[10px] text-muted-foreground">
                              {msg().sent_at
                                ? new Date(msg().sent_at).toLocaleString(
                                    locale() === "tr" ? "tr-TR" : "en-US",
                                    { dateStyle: "medium", timeStyle: "short" }
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-7 px-2 text-[10px] rounded-lg shrink-0"
                          onClick={() => toggleReadStatus(msg())}
                        >
                          {msg().read ? "Okunmadı Yap" : "Okundu İşaretle"}
                        </Button>
                      </div>

                      <Show when={msg().subject}>
                        <h3 class="text-sm font-semibold text-foreground tracking-tight">
                          {msg().subject}
                        </h3>
                      </Show>

                      <div class="rounded-lg bg-card p-3 border border-border/40 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {msg().body}
                      </div>

                      <div class="pt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          class="h-8 rounded-lg gap-1.5 text-xs font-medium"
                          onClick={() => goTo("/messages")}
                        >
                          <span>{t("rightPanel.openFullMessages")}</span>
                          <IconExternalLink class="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Show>
            </Show>

            {/* CALENDAR TAB */}
            <Show when={activeTab() === "calendar"}>
              {/* Calendar Item Preview View */}
              <Show
                when={selectedCalItem()}
                fallback={
                  /* Calendar Items List View */
                  <Suspense fallback={<PageSpinner />}>
                    {/* Filter Chips */}
                    <div class="flex items-center gap-1.5 pb-1 border-b border-border/40 text-xs">
                      <button
                        type="button"
                        onClick={() => { setCalFilter("all"); setCalPage(0); }}
                        class={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                          calFilter() === "all"
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {t("common.all")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCalFilter("events"); setCalPage(0); }}
                        class={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors border",
                          calFilter() === "events"
                            ? "bg-emerald-500 text-white font-semibold border-emerald-500"
                            : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        )}
                      >
                        {t("calendar.events")} ({activeEvents().length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCalFilter("exams"); setCalPage(0); }}
                        class={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors border",
                          calFilter() === "exams"
                            ? "bg-rose-500 text-white font-semibold border-rose-500"
                            : "text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                        )}
                      >
                        {t("calendar.exams")} ({activeExams().length})
                      </button>
                    </div>

                    <Show
                      when={paginatedCalItems().length > 0}
                      fallback={
                        <div class="flex h-48 flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                          <IconCalendarDays class="h-8 w-8 text-muted-foreground/40" />
                          <p>{t("rightPanel.noUpcoming")}</p>
                        </div>
                      }
                    >
                      <div class="space-y-2">
                        <For each={paginatedCalItems()}>
                          {(item) => {
                            const isEvent = item.type === "event";
                            const ev = item.data;
                            return (
                              <div
                                onClick={() => setSelectedCalItem(item)}
                                class={cn(
                                  "group flex cursor-pointer items-start justify-between gap-2.5 rounded-xl border p-3 shadow-2xs transition-all hover:shadow-md",
                                  isEvent
                                    ? "border-emerald-500/30 bg-emerald-500/[0.02] hover:border-emerald-500/60 hover:bg-emerald-500/[0.05]"
                                    : "border-rose-500/30 bg-rose-500/[0.02] hover:border-rose-500/60 hover:bg-rose-500/[0.05]"
                                )}
                              >
                                <div class="min-w-0 space-y-1">
                                  <p
                                    class={cn(
                                      "truncate text-xs font-semibold",
                                      isEvent
                                        ? "text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-600"
                                        : "text-rose-700 dark:text-rose-300 group-hover:text-rose-600"
                                    )}
                                  >
                                    {ev.title}
                                  </p>
                                  <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <IconClock class="h-3 w-3 shrink-0" />
                                    <span>
                                      {ev.starts_at
                                        ? new Date(ev.starts_at).toLocaleDateString(
                                            locale() === "tr" ? "tr-TR" : "en-US",
                                            { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
                                          )
                                        : ""}
                                    </span>
                                  </div>
                                </div>

                                <Badge
                                  variant="outline"
                                  class={cn(
                                    "shrink-0 text-[9px] font-semibold px-2 py-0.5",
                                    isEvent
                                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                                      : "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10"
                                  )}
                                >
                                  {isEvent ? t("calendar.events") : t("calendar.exams")}
                                </Badge>
                              </div>
                            );
                          }}
                        </For>
                      </div>

                      {/* Pagination Controls */}
                      <Show when={calTotalPages() > 1}>
                        <PaginationControls
                          page={calPage()}
                          totalPages={calTotalPages()}
                          onPageChange={setCalPage}
                        />
                      </Show>
                    </Show>
                  </Suspense>
                }
              >
                {(item) => {
                  const isEvent = item().type === "event";
                  const data = item().data;
                  return (
                    <div class="space-y-4 animate-in fade-in-50">
                      <div
                        class={cn(
                          "rounded-xl border p-4 space-y-3",
                          isEvent
                            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                            : "border-rose-500/30 bg-rose-500/[0.03]"
                        )}
                      >
                        <div class="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            class={cn(
                              "text-xs font-semibold px-2.5 py-0.5",
                              isEvent
                                ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                                : "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10"
                            )}
                          >
                            {isEvent ? t("calendar.events") : t("calendar.exams")}
                          </Badge>
                        </div>

                        <h3 class="text-base font-bold text-foreground tracking-tight">
                          {data.title}
                        </h3>

                        <div class="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
                          <div class="flex items-center gap-2">
                            <IconClock class="h-4 w-4 text-primary shrink-0" />
                            <span>
                              {data.starts_at
                                ? new Date(data.starts_at).toLocaleString(
                                    locale() === "tr" ? "tr-TR" : "en-US",
                                    { dateStyle: "full", timeStyle: "short" }
                                  )
                                : "—"}
                            </span>
                          </div>

                          <Show when={"description" in data && data.description}>
                            <div class="pt-2 border-t border-border/30 text-foreground">
                              <p class="text-xs font-medium text-muted-foreground mb-1">Açıklama / Detay:</p>
                              <p class="text-xs leading-relaxed whitespace-pre-wrap">{String(data.description)}</p>
                            </div>
                          </Show>
                        </div>

                        <div class="pt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            class="h-8 rounded-lg gap-1.5 text-xs font-medium"
                            onClick={() => goTo(isEvent ? `/events/${data.id}` : `/exams/${data.id}`)}
                          >
                            <span>Detay Sayfasına Git</span>
                            <IconExternalLink class="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </Show>
            </Show>
          </div>

          {/* Drawer Footer Action */}
          <div class="shrink-0 border-t border-border/60 p-3 bg-card/60">
            <Show when={activeTab() === "messages"}>
              <Button
                type="button"
                variant="outline"
                class="w-full justify-between h-9 rounded-lg text-xs font-medium"
                onClick={() => goTo("/messages")}
              >
                <span>{t("rightPanel.openFullMessages")}</span>
                <IconChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Show>

            <Show when={activeTab() === "calendar"}>
              <Button
                type="button"
                variant="outline"
                class="w-full justify-between h-9 rounded-lg text-xs font-medium"
                onClick={() => goTo("/calendar")}
              >
                <span>{t("rightPanel.openFullCalendar")}</span>
                <IconChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
}
