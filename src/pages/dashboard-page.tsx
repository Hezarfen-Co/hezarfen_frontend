import { Link } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getEvents } from "@/api/getEvents";
import { getExams } from "@/api/getExams";
import { getMyMarks } from "@/api/getMyMarks";
import { getNotes } from "@/api/getNotes";
import type { Event, Exam, Note } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconExam,
  IconNote,
  IconPlus,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const PREVIEW_LIMIT = 10;
const PAGE_SIZE = 5;

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
  const [marks] = createResource(() => getMyMarks());

  const noteCount = createMemo(() => notes()?.length ?? 0);
  const eventCount = createMemo(() => events()?.length ?? 0);
  const examCount = createMemo(() => exams()?.length ?? 0);
  const overallAvg = createMemo(() => marks()?.overall_average ?? null);

  const previewNotes = createMemo(() => (notes() ?? []).slice(0, PREVIEW_LIMIT));
  const previewEvents = createMemo(() => (events() ?? []).slice(0, PREVIEW_LIMIT));
  const previewExams = createMemo(() => (exams() ?? []).slice(0, PREVIEW_LIMIT));

  return (
    <div class="space-y-5">
      {/* Compact greeting + guide */}
      <PageHeader
        compact
        accent="mint"
        title={t("dashboard.greeting", { name: user().username })}
        description={t("dashboard.subtitle")}
        actions={
          <Link to="/guide">
            <Button variant="outline" size="sm">
              {t("dashboard.continueGuide")}
            </Button>
          </Link>
        }
      />

      {/* Action CTAs — not sidebar mirrors; 4 verb-style shortcuts */}
      <section>
        <h2 class="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dashboard.quickActions")}
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Show
            when={hasMinRole(user().role, "teacher")}
            fallback={
              <>
                <ActionCard
                  to="/notes"
                  title={t("dashboard.action.note")}
                  hint={t("dashboard.action.noteHint")}
                  icon="✎"
                  tone="amber"
                />
                <ActionCard
                  to="/events"
                  title={t("dashboard.action.attend")}
                  hint={t("dashboard.action.attendHint")}
                  icon="◷"
                  tone="sky"
                />
                <ActionCard
                  to="/courses"
                  title={t("nav.courses")}
                  hint={t("courses.subtitle")}
                  icon="▣"
                  tone="violet"
                />
                <ActionCard
                  to="/marks"
                  title={t("dashboard.action.marks")}
                  hint={t("dashboard.action.marksHint")}
                  icon="▤"
                  tone="mint"
                />
              </>
            }
          >
            <ActionCard
              to="/notes"
              title={t("dashboard.action.note")}
              hint={t("dashboard.action.noteHint")}
              icon="✎"
              tone="amber"
            />
            <ActionCard
              to="/events"
              title={t("dashboard.action.event")}
              hint={t("dashboard.action.eventHint")}
              icon="◷"
              tone="sky"
            />
            <ActionCard
              to="/courses"
              title={t("dashboard.action.course")}
              hint={t("dashboard.action.courseHint")}
              icon="▣"
              tone="violet"
            />
            <ActionCard
              to="/courses"
              title={t("dashboard.action.exam")}
              hint={t("dashboard.action.examHint")}
              icon="☰"
              tone="rose"
            />
          </Show>
        </div>
      </section>

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
        <div class="surface-card flex min-h-[18rem] flex-col p-4 sm:p-5">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="font-display text-base font-semibold sm:text-lg">{t("dashboard.recentNotes")}</h2>
            <Link to="/notes" class="text-sm font-medium text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <Suspense fallback={<PageSpinner />}>
            <PaginatedList
              items={previewNotes()}
              pageSize={PAGE_SIZE}
              empty={
                <EmptyPanel
                  icon={<IconNote class="h-6 w-6" />}
                  title={t("dashboard.emptyNotesTitle")}
                  description={t("dashboard.noNotes")}
                  cta={t("dashboard.emptyNotesCta")}
                  to="/notes"
                  tone="amber"
                />
              }
            >
              {(pageItems) => (
                <ul class="flex flex-1 flex-col divide-y divide-border/70">
                  <For each={pageItems()}>
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
              )}
            </PaginatedList>
          </Suspense>
        </div>

        <div class="surface-card flex min-h-[18rem] flex-col p-4 sm:p-5">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="font-display text-base font-semibold sm:text-lg">{t("dashboard.upcomingEvents")}</h2>
            <Link to="/events" class="text-sm font-medium text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <Suspense fallback={<PageSpinner />}>
            <PaginatedList
              items={previewEvents()}
              pageSize={PAGE_SIZE}
              empty={
                <EmptyPanel
                  icon={<IconCalendar class="h-6 w-6" />}
                  title={t("dashboard.emptyEventsTitle")}
                  description={t("dashboard.noEvents")}
                  cta={t("dashboard.emptyEventsCta")}
                  to="/events"
                  tone="sky"
                />
              }
            >
              {(pageItems) => (
                <ul class="flex flex-1 flex-col gap-2">
                  <For each={pageItems()}>
                    {(event: Event) => (
                      <li>
                        <Link
                          to="/events/$id"
                          params={{ id: event.id }}
                          class="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
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
              )}
            </PaginatedList>
          </Suspense>
        </div>

        <div class="surface-card flex min-h-[18rem] flex-col p-4 sm:p-5">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="font-display text-base font-semibold sm:text-lg">{t("dashboard.myExams")}</h2>
            <Link to="/exams" class="text-sm font-medium text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <Suspense fallback={<PageSpinner />}>
            <PaginatedList
              items={previewExams()}
              pageSize={PAGE_SIZE}
              empty={
                <EmptyPanel
                  icon={<IconExam class="h-6 w-6" />}
                  title={t("dashboard.emptyExamsTitle")}
                  description={t("exams.empty")}
                  cta={t("dashboard.emptyExamsCta")}
                  to="/exams"
                  tone="rose"
                />
              }
            >
              {(pageItems) => (
                <ul class="flex flex-1 flex-col gap-2">
                  <For each={pageItems()}>
                    {(exam: Exam) => (
                      <li>
                        <Link
                          to="/exams/$id"
                          params={{ id: exam.id }}
                          class="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                        >
                          <div class="min-w-0">
                            <p class="truncate text-sm font-medium">{exam.title}</p>
                            <p class="truncate text-xs text-muted-foreground">
                              {exam.description || "—"}
                            </p>
                          </div>
                          <Badge variant="outline" class="shrink-0 capitalize">
                            {exam.kind}
                          </Badge>
                        </Link>
                      </li>
                    )}
                  </For>
                </ul>
              )}
            </PaginatedList>
          </Suspense>
        </div>
      </section>

    </div>
  );
}

function PaginatedList<T>(props: {
  items: T[];
  empty: any;
  pageSize: number;
  children: (pageItems: () => T[]) => any;
}) {
  const t = useT();
  const [page, setPage] = createSignal(0);

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(props.items.length / props.pageSize)),
  );
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const pageItems = createMemo(() => {
    const start = safePage() * props.pageSize;
    return props.items.slice(start, start + props.pageSize);
  });

  return (
    <Show when={props.items.length > 0} fallback={props.empty}>
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="flex-1">{props.children(pageItems)}</div>
        <Show when={props.items.length > props.pageSize}>
          <div class="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 gap-1"
              disabled={safePage() <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <IconChevronLeft class="h-3.5 w-3.5" />
              {t("common.prev")}
            </Button>
            <span class="text-xs tabular-nums text-muted-foreground">
              {t("common.pageOf", { page: safePage() + 1, total: totalPages() })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 gap-1"
              disabled={safePage() >= totalPages() - 1}
              onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
            >
              {t("common.next")}
              <IconChevronRight class="h-3.5 w-3.5" />
            </Button>
          </div>
        </Show>
      </div>
    </Show>
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
    <div class="stat-tile h-full min-h-[5.5rem] p-4">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{props.label}</p>
      <p class={cn("mt-1.5 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl", tones[props.tone])}>
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

function ActionCard(props: {
  to: string;
  title: string;
  hint: string;
  icon: string;
  tone: "mint" | "sky" | "amber" | "violet" | "rose";
}) {
  const ring = {
    mint: "hover:border-emerald-500/40",
    sky: "hover:border-sky-500/40",
    amber: "hover:border-amber-500/40",
    violet: "hover:border-violet-500/40",
    rose: "hover:border-rose-500/40",
  };
  const iconBg = {
    mint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };

  return (
    <Link
      to={props.to}
      class={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card px-3.5 py-3 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
        ring[props.tone],
      )}
    >
      <span
        class={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-base",
          iconBg[props.tone],
        )}
      >
        {props.icon}
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">{props.title}</span>
        <span class="block truncate text-xs text-muted-foreground">{props.hint}</span>
      </span>
    </Link>
  );
}

function EmptyPanel(props: {
  icon: any;
  title: string;
  description: string;
  cta: string;
  to: string;
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
      <Link to={props.to} class="mt-4">
        <Button size="sm" class="gap-1.5">
          <IconPlus class="h-3.5 w-3.5" />
          {props.cta}
        </Button>
      </Link>
    </div>
  );
}
