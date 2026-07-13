import { Link } from "@tanstack/solid-router";
import { For } from "solid-js";
import type { Role } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

type RoleAction = {
  to: string;
  title: MessageKey;
  hint: MessageKey;
  marker: string;
  tone: "mint" | "sky" | "amber" | "violet" | "rose";
};

const ROLE_KEY: Record<Role, MessageKey> = {
  student: "role.student",
  teacher: "role.teacher",
  manager: "role.manager",
  admin: "role.admin",
};

const ROLE_ACTIONS: Record<Role, RoleAction[]> = {
  student: [
    { to: "/marks", title: "dashboard.action.marks", hint: "dashboard.action.marksHint", marker: "▤", tone: "mint" },
    { to: "/exams", title: "dashboard.myExams", hint: "exams.subtitle", marker: "☰", tone: "rose" },
    { to: "/events", title: "dashboard.action.attend", hint: "dashboard.action.attendHint", marker: "◷", tone: "sky" },
  ],
  teacher: [
    { to: "/courses", title: "dashboard.action.course", hint: "dashboard.action.courseHint", marker: "▣", tone: "violet" },
    { to: "/courses", title: "dashboard.action.exam", hint: "dashboard.action.examHint", marker: "☰", tone: "rose" },
    { to: "/exams", title: "exams.liveMonitor", hint: "exams.liveMonitorDesc", marker: "◎", tone: "amber" },
  ],
  manager: [
    { to: "/courses", title: "nav.courses", hint: "courses.subtitle", marker: "▣", tone: "violet" },
    { to: "/events", title: "nav.events", hint: "events.subtitle", marker: "◷", tone: "sky" },
    { to: "/exams", title: "exams.liveMonitor", hint: "exams.liveMonitorDesc", marker: "◎", tone: "amber" },
    { to: "/marks", title: "dashboard.action.marks", hint: "dashboard.action.marksHint", marker: "▤", tone: "mint" },
  ],
  admin: [
    { to: "/admin/users", title: "nav.users", hint: "admin.subtitle", marker: "◉", tone: "amber" },
    { to: "/courses", title: "nav.courses", hint: "courses.subtitle", marker: "▣", tone: "violet" },
    { to: "/events", title: "nav.events", hint: "events.subtitle", marker: "◷", tone: "sky" },
    { to: "/exams", title: "exams.liveMonitor", hint: "exams.liveMonitorDesc", marker: "◎", tone: "rose" },
  ],
};

export function RoleHomePanel(props: { role: Role }) {
  const t = useT();
  const actions = () => ROLE_ACTIONS[props.role];
  const markerTone = {
    mint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };

  return (
    <section class="surface-card relative overflow-hidden p-4 sm:p-5">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div class="mb-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("dashboard.overview")}
          </p>
          <h2 class="mt-1 font-display text-lg font-semibold">
            {t("dashboard.stats.role")}: {t(ROLE_KEY[props.role])}
          </h2>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <For each={actions()}>
          {(action) => (
            <Link
              to={action.to}
              class="group flex min-h-24 items-center gap-3 rounded-lg border border-border/80 bg-gradient-to-br from-card to-muted/20 px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span class={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg", markerTone[action.tone])}>
                {action.marker}
              </span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold group-hover:text-primary">{t(action.title)}</span>
                <span class="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {t(action.hint)}
                </span>
              </span>
            </Link>
          )}
        </For>
      </div>
    </section>
  );
}
