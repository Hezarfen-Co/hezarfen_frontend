import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import { getAcademicYears } from "@/api/academic-years";
import { getClasses } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getUserSearch } from "@/api/users";
import { IconCheck, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";

type Step = {
  id: string;
  labelKey: MessageKey;
  to: string;
  module?: string;
  /** How many exist now; the step is done at one or more. */
  count: () => Promise<number>;
};

const STEPS: Step[] = [
  { id: "year", labelKey: "setup.academicYear", to: "/management/academic-years", count: async () => (await getAcademicYears({ limit: 1 })).total },
  { id: "teachers", labelKey: "setup.teachers", to: "/management/teachers", count: async () => (await getUserSearch("", undefined, "teacher", { limit: 1 })).total },
  { id: "students", labelKey: "setup.students", to: "/management/students", count: async () => (await getUserSearch("", undefined, "student", { limit: 1 })).total },
  { id: "classes", labelKey: "setup.classes", to: "/management/classes", module: "classes", count: async () => (await getClasses({ limit: 1 })).total },
  { id: "courses", labelKey: "setup.courses", to: "/courses", module: "courses", count: async () => (await getCourses({ limit: 1 })).total },
];

/**
 * ADM "school setup": the five things a new school needs before the rest of
 * the app has anything to show, each ticked by a real count (at least one
 * exists) and linking to where it is added. A read that fails leaves its step
 * unknown rather than claiming it done or missing. Once every step is done
 * the panel steps aside.
 */
export function SetupChecklistPanel(props: { moduleOn: (module: string) => boolean }) {
  const t = useT();
  const [status] = createResource(async () => {
    const steps = STEPS.filter((step) => !step.module || props.moduleOn(step.module));
    return Promise.all(
      steps.map(async (step) => ({ step, done: await step.count().then((total) => total > 0).catch(() => null) })),
    );
  });
  const doneCount = () => (status() ?? []).filter((row) => row.done === true).length;
  const allDone = () => (status() ?? []).length > 0 && doneCount() === status()!.length;

  return (
    <Show when={status() && !allDone()}>
      <section class="flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4" aria-labelledby="setup-heading">
        <div class="flex items-baseline justify-between gap-2">
          <h2 id="setup-heading" class="text-base font-semibold tracking-tight text-text-strong">{t("setup.title")}</h2>
          <span class="text-xs font-medium text-muted-foreground">{t("setup.progress", { done: doneCount(), total: status()!.length })}</span>
        </div>
        <ol class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <For each={status()}>
            {(row) => (
              <li>
                <Link
                  to={row.step.to as never}
                  class={cn(
                    "flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm outline-hidden transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
                    row.done ? "border-success/30 text-muted-foreground" : "border-border-line text-text-default",
                  )}
                >
                  <span
                    class={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      row.done ? "border-success bg-success text-white" : "border-border-line",
                    )}
                    aria-hidden="true"
                  >
                    <Show when={row.done}>
                      <IconCheck class="h-3 w-3" />
                    </Show>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{t(row.step.labelKey)}</span>
                    <span class="block text-xs text-muted-foreground">
                      {row.done === true ? t("setup.done") : row.done === false ? t("setup.todo") : t("setup.unknown")}
                    </span>
                  </span>
                  <IconChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            )}
          </For>
        </ol>
      </section>
    </Show>
  );
}
