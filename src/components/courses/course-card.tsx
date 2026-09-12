import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Course } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { IconBook, IconChevronRight, IconUsers } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";

export function CourseCard(props: {
  course: Course;
  term: string;
  enrolled?: boolean;
  labels: {
    capacity: string;
    unlimited: string;
    enrolled: string;
    kind: string;
  };
}) {
  const teachers = () => [props.course.creator, ...(props.course.teachers ?? [])]
    .filter((person, index, all) => all.findIndex((row) => row.id === person.id) === index);

  return (
    <Link
      to="/courses/$id"
      params={{ id: props.course.id }}
      class="group grid gap-3 rounded-xl border border-border-line bg-surface-base px-4 py-3 outline-hidden transition-colors hover:border-primary/35 hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div class="flex min-w-0 items-start gap-3">
        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
          <IconBook class="h-4 w-4" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="truncate text-base font-semibold tracking-tight">{props.course.title}</h2>
            <Badge variant="outline" class="rounded-md text-[10px] font-medium">{props.labels.kind}</Badge>
            <Show when={props.enrolled}><Badge variant="secondary" class="rounded-md text-[10px]">{props.labels.enrolled}</Badge></Show>
          </div>
          <p class="mt-0.5 line-clamp-1 text-sm text-text-subtle">{props.course.description || "—"}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-subtle">
            <span>{props.term}</span>
            <span class="flex min-w-0 items-center gap-1.5">
              <IconUsers class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{teachers().map(personLabel).join(", ")}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 border-t border-border-hairline pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <div class="text-left sm:text-right">
          <p class="text-[10px] font-medium uppercase tracking-wider text-text-subtle">{props.labels.capacity}</p>
          <p class="mt-0.5 font-semibold tabular-nums">{props.course.capacity ?? props.labels.unlimited}</p>
        </div>
        <IconChevronRight class="h-4 w-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text-default" />
      </div>
    </Link>
  );
}
