import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Course } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { IconChevronRight, IconUsers } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";

const courseInitials = (title: string) =>
  title.trim().slice(0, 2).toLocaleUpperCase("tr-TR") || "—";

export function CourseCard(props: {
  course: Course;
  /** The şubeler line under the title: "3 sections", or a dash. */
  sections: string;
  enrolled?: boolean;
  labels: {
    kind: string;
    enrolled: string;
  };
}) {
  // Teaching staff is per instance now, so a catalog card can only name the
  // course's owner — the şube pages name who actually teaches it.
  const teachers = () => [props.course.creator];

  return (
    <Link
      to="/courses/$id"
      params={{ id: props.course.id }}
      class="group flex h-full min-h-40 flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4 outline-hidden transition-colors hover:border-primary/35 hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary-text">
          {courseInitials(props.course.title)}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <h2 class="truncate text-base font-semibold tracking-tight">{props.course.title}</h2>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" class="rounded-md text-[11px] font-medium">{props.labels.kind}</Badge>
            <Show when={props.enrolled}><Badge variant="secondary" class="rounded-md text-[11px]">{props.labels.enrolled}</Badge></Show>
          </div>
        </div>
        <IconChevronRight class="mt-1 h-4 w-4 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text-default" />
      </div>

      <Show when={props.course.description}>
        <p class="line-clamp-2 text-sm leading-5 text-text-subtle">{props.course.description}</p>
      </Show>

      <div class="mt-auto flex items-center justify-between gap-3 border-t border-border-hairline pt-3 text-xs text-text-subtle">
        <span class="min-w-0 flex-1 truncate">{props.sections}</span>
        <span class="flex min-w-0 items-center gap-1.5">
          <IconUsers class="h-3.5 w-3.5 shrink-0" />
          <span class="max-w-32 truncate">{teachers().map(personLabel).join(", ")}</span>
        </span>
      </div>
    </Link>
  );
}
