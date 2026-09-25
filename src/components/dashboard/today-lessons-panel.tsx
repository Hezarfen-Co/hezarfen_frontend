import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import { getInstanceSessions, getMyInstances } from "@/api/instances";
import { getSessionAttendance } from "@/api/sessions";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { lessonNow, rollCallState, sessionsToday, dayBounds, type RollCallState, type TodayLesson } from "@/lib/today-lessons";
import { LIST_CAP, loadWindowedList } from "@/lib/capped-list";
import { usePreferences, useT } from "@/stores/preferences-context";
import type { MessageKey } from "@/i18n/messages";

/** Sections read for today's sessions; a teacher's own sections stay well under it. */
const INSTANCE_CAP = 30;

const STATE_STYLE: Record<RollCallState, { key: MessageKey; class: string }> = {
  "not-taken": { key: "today.rollCallNotTaken", class: "border-destructive/30 bg-destructive/10 text-destructive-text" },
  partial: { key: "today.rollCallPartial", class: "border-warning/30 bg-warning/10 text-warning-text" },
  done: { key: "today.rollCallDone", class: "border-success/30 bg-success/10 text-success-text" },
  upcoming: { key: "today.upcoming", class: "border-border-line bg-surface-tint text-muted-foreground" },
  "in-progress": { key: "today.inProgress", class: "border-primary/30 bg-primary/10 text-primary-text" },
};

/**
 * TCH "today": the teacher's lessons for the day in time order, each with
 * what its roll call still needs, linking straight to that roll call. Read
 * only — the dashboard never takes attendance itself. Every figure is a real
 * read: sessions from the teacher's sections, marks from the session's roll
 * call, the roster size from the section's enrollment count.
 */
export function TodayLessonsPanel(props: {
  now: number;
  courseTitle: (courseId: string) => string;
  /**
   * "student": the same day plan without roll-call reads (the route is the
   * teacher's), marking only the lesson that is on now.
   */
  audience?: "teacher" | "student";
  class?: string;
}) {
  const forStudent = () => props.audience === "student";
  const t = useT();
  const { locale } = usePreferences();
  const [lessons] = createResource(
    () => props.now,
    async (now): Promise<{ items: TodayLesson[]; error: string }> => {
      try {
        const instances = (await getMyInstances()).items.slice(0, INSTANCE_CAP);
        const perInstance = await Promise.all(
          instances.map(async (instance) => {
            // The route filters on the same half-open local-day bounds
            // `sessionsToday` keeps, so the visible set is unchanged — but
            // the read is now paged (offsets followed only while the
            // envelope total exceeds the page) instead of every session ever.
            const [dayStart, dayEnd] = dayBounds(now);
            const sessions = await loadWindowedList(
              (params) => getInstanceSessions(instance.id, { ...params, starts_after: dayStart, starts_before: dayEnd }),
              LIST_CAP,
            ).then((list) => list.items).catch(() => []);
            return sessionsToday(sessions, now).map((session) => ({ session, instance }));
          }),
        );
        const today = perInstance.flat().sort((a, b) => a.session.starts_at - b.session.starts_at);
        const items = await Promise.all(
          today.map(async ({ session, instance }) => {
            if (forStudent()) {
              return { session, instance, marked: null, state: lessonNow(session.starts_at, session.ends_at ?? null, now) };
            }
            const marked = session.starts_at > now
              ? 0
              : await getSessionAttendance(session.id, { limit: 1 }).then((page) => page.total).catch(() => null);
            return { session, instance, marked, state: rollCallState(session.starts_at, now, marked, instance.enrollment_count) };
          }),
        );
        return { items, error: "" };
      } catch (err) {
        return { items: [], error: formatApiError(err) };
      }
    },
  );
  const time = (ms: number | null | undefined) =>
    ms == null ? "" : new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(ms);
  const owed = () => (lessons()?.items ?? []).filter((lesson) => lesson.state === "not-taken" || lesson.state === "partial").length;

  return (
    <section class={cn("flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4", props.class)} aria-labelledby="today-lessons-heading">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-lessons-heading" class="text-base font-semibold tracking-tight text-text-strong">{forStudent() ? t("today.titleStudent") : t("today.title")}</h2>
        <Show when={owed() > 0}>
          <span class="text-xs font-medium text-destructive-text">{t("today.owed", { count: owed() })}</span>
        </Show>
      </div>
      <Show when={lessons()?.error}>
        <p class="text-sm text-destructive-text">{lessons()!.error}</p>
      </Show>
      <Show
        when={(lessons()?.items.length ?? 0) > 0}
        fallback={<Show when={!lessons()?.error}><EmptyInline illustration="calendar-empty" title={t("today.empty")} /></Show>}
      >
        <ul class="divide-y divide-border-hairline">
          <For each={lessons()!.items}>
            {(lesson) => {
              const style = () => (lesson.state ? STATE_STYLE[lesson.state] : null);
              const needsRollCall = () => lesson.state === "not-taken" || lesson.state === "partial";
              return (
                <li>
                  <Link
                    to="/instances/$id"
                    params={{ id: lesson.instance.id }}
                    search={(forStudent() ? { tab: "sessions" } : { tab: "sessions", rollCall: lesson.session.id }) as never}
                    class="flex items-center gap-3 py-2.5 outline-hidden hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span class="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {time(lesson.session.starts_at)}
                      <Show when={lesson.session.ends_at}>–{time(lesson.session.ends_at)}</Show>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-text-default">{props.courseTitle(lesson.instance.course)}</span>
                      <Show when={lesson.session.topic?.trim()}>
                        <span class="block truncate text-xs text-muted-foreground">{lesson.session.topic}</span>
                      </Show>
                    </span>
                    <Show when={style()}>
                      {(current) => (
                        <span class={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", current().class)}>
                          {lesson.state === "partial"
                            ? t(current().key, { marked: lesson.marked ?? 0, total: lesson.instance.enrollment_count })
                            : t(current().key)}
                        </span>
                      )}
                    </Show>
                    <IconChevronRight class={cn("h-4 w-4 shrink-0", needsRollCall() ? "text-foreground" : "text-muted-foreground/60")} />
                  </Link>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </section>
  );
}
