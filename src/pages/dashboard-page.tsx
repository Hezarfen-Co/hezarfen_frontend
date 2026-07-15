import { Link } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource } from "solid-js";
import { getEvents } from "@/api/getEvents";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { getMyMarks } from "@/api/getMyMarks";
import { getNotes } from "@/api/getNotes";
import { formatApiError } from "@/api/client";
import type { Event, Exam, Note } from "@/api/types";
import { ExamLink } from "@/components/exams/exam-link";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  IconCalendar,
  IconExam,
  IconNote,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { examKindLabel } from "@/lib/exam-labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const PREVIEW_LIMIT = 5;

const roundAvg = (n: number) => (Math.round(n * 10) / 10).toString();

export default function DashboardPage() {
  return (
    <RouteGuard>
      <DashboardContent />
    </RouteGuard>
  );
}

function DashboardContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const user = () => auth.user()!;

  const [notes] = createResource(() => getNotes());
  const [events] = createResource(() => getEvents());
  const [exams] = createResource(() => getExams());
  const [myCourses] = createResource(
    () => (user().role === "student" ? true : null),
    async (enabled) => (enabled ? getMyCourses() : []),
  );
  const [marks] = createResource(() => getMyMarks());

  const resourceError = createMemo(() => {
    const e = notes.error || events.error || exams.error || myCourses.error || marks.error;
    return e ? formatApiError(e, locale()) : null;
  });

  const visibleExams = createMemo(() => {
    const all = exams() ?? [];
    if (user().role !== "student") return all;
    const allowed = new Set((myCourses() ?? []).map((course) => course.id));
    return all.filter((exam) => allowed.has(exam.course));
  });

  const noteCount = createMemo(() => notes()?.length ?? 0);
  const eventCount = createMemo(() => events()?.length ?? 0);
  const examCount = createMemo(() => visibleExams().length);
  const overallAvg = createMemo(() => marks()?.overall_average ?? null);

  const previewNotes = createMemo(() => (notes() ?? []).slice(0, PREVIEW_LIMIT));
  const previewEvents = createMemo(() => (events() ?? []).slice(0, PREVIEW_LIMIT));
  const previewExams = createMemo(() => visibleExams().slice(0, PREVIEW_LIMIT));

  return (
    <div class="space-y-5">
      <PageHeader
        compact
        accent="mint"
        title={t("dashboard.greeting", { name: user().username })}
        description={t("dashboard.subtitle")}
      />

      <Show when={resourceError()}>
        {(msg) => <Alert variant="destructive">{msg()}</Alert>}
      </Show>

      {/* KPIs below actions */}
      <Suspense fallback={<PageSpinner />}>
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t("dashboard.stats.notes")}
            value={String(noteCount())}
            hint={t("nav.notes")}
            tone="mint"
            to="/notes"
          />
          <StatTile
            label={t("dashboard.stats.events")}
            value={String(eventCount())}
            hint={t("nav.events")}
            tone="sky"
            to="/events"
          />
          <StatTile
            label={t("dashboard.stats.exams")}
            value={String(examCount())}
            hint={t("nav.exams")}
            tone="amber"
            to="/exams"
          />
          <StatTile
            label={t("dashboard.stats.average")}
            value={overallAvg() == null ? "—" : roundAvg(overallAvg()!)}
            hint={t("dashboard.stats.averageHint")}
            tone="violet"
            to="/marks"
            suffix={overallAvg() == null ? undefined : "/100"}
          />
        </section>
      </Suspense>

      {/* Summaries */}
      <section class="grid items-stretch gap-4 lg:grid-cols-3">
        <div class="data-shell flex min-h-[18rem] flex-col overflow-hidden">
          <div class="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-4 py-3 sm:px-5">
            <h2 class="font-display text-base font-semibold tracking-tight sm:text-lg">{t("dashboard.recentNotes")}</h2>
          </div>
          <div class="flex flex-1 p-4 sm:p-5">
          <Suspense fallback={<PageSpinner />}>
            <Show
              when={previewNotes().length > 0}
              fallback={
                <EmptyPanel
                  icon={<IconNote class="h-6 w-6" />}
                  title={t("dashboard.emptyNotesTitle")}
                  description={t("dashboard.noNotes")}
                  tone="amber"
                />
              }
            >
              <ul class="flex flex-1 flex-col divide-y divide-border/70">
                <For each={previewNotes()}>
                  {(note: Note) => (
                    <li class="flex min-h-[3.5rem] items-start gap-3 py-3 first:pt-0">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">{note.title}</p>
                        <p class="truncate text-xs text-muted-foreground">
                          {note.content || t("notes.noContent")}
                        </p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Suspense>
          </div>
        </div>

        <div class="data-shell flex min-h-[18rem] flex-col overflow-hidden">
          <div class="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-4 py-3 sm:px-5">
            <h2 class="font-display text-base font-semibold tracking-tight sm:text-lg">{t("dashboard.upcomingEvents")}</h2>
          </div>
          <div class="flex flex-1 p-4 sm:p-5">
          <Suspense fallback={<PageSpinner />}>
            <Show
              when={previewEvents().length > 0}
              fallback={
                <EmptyPanel
                  icon={<IconCalendar class="h-6 w-6" />}
                  title={t("dashboard.emptyEventsTitle")}
                  description={t("dashboard.noEvents")}
                  tone="sky"
                />
              }
            >
              <ul class="flex flex-1 flex-col gap-2">
                <For each={previewEvents()}>
                  {(event: Event) => (
                    <li>
                      <Link
                        to="/events/$id"
                        params={{ id: event.id }}
                         class="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-muted/45"
                      >
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium">{event.title}</p>
                          <p class="text-xs text-muted-foreground">
                            {formatDateTime(event.starts_at, locale())}
                          </p>
                        </div>
                        <span class="text-primary" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Suspense>
          </div>
        </div>

        <div class="data-shell flex min-h-[18rem] flex-col overflow-hidden">
          <div class="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-4 py-3 sm:px-5">
            <h2 class="font-display text-base font-semibold tracking-tight sm:text-lg">{t("dashboard.myExams")}</h2>
          </div>
          <div class="flex flex-1 p-4 sm:p-5">
          <Suspense fallback={<PageSpinner />}>
            <Show
              when={previewExams().length > 0}
              fallback={
                <EmptyPanel
                  icon={<IconExam class="h-6 w-6" />}
                  title={t("dashboard.emptyExamsTitle")}
                  description={t("exams.empty")}
                  tone="rose"
                />
              }
            >
              <ul class="flex flex-1 flex-col gap-2">
                <For each={previewExams()}>
                  {(exam: Exam) => (
                    <li>
                      <ExamLink
                        examId={exam.id}
                         class="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-muted/45"
                      >
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium">{exam.title}</p>
                          <p class="truncate text-xs text-muted-foreground">
                            {exam.description || "—"}
                          </p>
                        </div>
                        <Badge variant="outline" class="shrink-0 rounded-sm capitalize">
                            {examKindLabel(String(exam.kind), t)}
                          </Badge>
                        </ExamLink>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </Suspense>
          </div>
        </div>
      </section>

    </div>
  );
}

function StatTile(props: {
  label: string;
  value: string;
  hint: string;
  tone: "mint" | "sky" | "amber" | "violet";
  to?: string;
  suffix?: string;
}) {
  const tones = {
    mint: "text-emerald-700 dark:text-emerald-300",
    sky: "text-sky-700 dark:text-sky-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
  };

  const inner = (
    <div class="data-shell h-full min-h-[5.5rem] p-4 transition-colors duration-150 hover:border-primary/35">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{props.label}</p>
      <p class={cn("mono mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl", tones[props.tone])}>
        {props.value}
        <Show when={props.suffix}>
          <span class="text-sm font-medium text-muted-foreground"> {props.suffix}</span>
        </Show>
      </p>
      <p class="mt-1 text-xs text-muted-foreground">{props.hint}</p>
    </div>
  );

  if (props.to) {
    return (
      <Link to={props.to} class="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

function EmptyPanel(props: {
  icon: any;
  title: string;
  description: string;
  tone: "amber" | "sky" | "rose";
}) {
  const tones = {
    amber: "from-amber-500/10 via-transparent to-transparent text-amber-700 dark:text-amber-300",
    sky: "from-sky-500/10 via-transparent to-transparent text-sky-700 dark:text-sky-300",
    rose: "from-rose-500/10 via-transparent to-transparent text-rose-700 dark:text-rose-300",
  };

  return (
    <div
      class={cn(
        "flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-gradient-to-b px-4 py-8 text-center",
        tones[props.tone],
      )}
    >
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-border/70 bg-card text-current shadow-sm">
        {props.icon}
      </div>
      <p class="font-display text-base font-semibold text-foreground">{props.title}</p>
      <p class="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
        {props.description}
      </p>
    </div>
  );
}
