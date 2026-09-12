import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Course } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { IconBook, IconChevronRight, IconClipboardCheck, IconClock, IconTarget, IconUsers } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";

const courseInitials = (title: string) =>
  title.trim().slice(0, 2).toLocaleUpperCase("tr-TR") || "—";

export function CourseCard(props: {
  course: Course;
  term: string;
  enrolled?: boolean;
  showTeacherActions?: boolean;
  labels: {
    capacity: string;
    unlimited: string;
    enrolled: string;
    kind: string;
    weeklyHours: string;
    competency: string;
    attendance: string;
    progress: string;
    takeAttendance: string;
    analysis: string;
  };
}) {
  const teachers = () => [props.course.creator, ...(props.course.teachers ?? [])]
    .filter((person, index, all) => all.findIndex((row) => row.id === person.id) === index);

  return (
    <Link
      to="/courses/$id"
      params={{ id: props.course.id }}
      class="group flex h-full flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4 outline-hidden transition-colors hover:border-primary/35 hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-xs font-semibold text-text-subtle">
          {courseInitials(props.course.title)}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <h2 class="truncate text-base font-semibold tracking-tight">{props.course.title}</h2>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" class="rounded-md text-[10px] font-medium">{props.labels.kind}</Badge>
            <Show when={props.enrolled}><Badge variant="secondary" class="rounded-md text-[10px]">{props.labels.enrolled}</Badge></Show>
          </div>
        </div>
        <IconChevronRight class="mt-1 h-4 w-4 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text-default" />
      </div>

      <p class="line-clamp-2 min-h-8 text-sm text-text-subtle">{props.course.description || "—"}</p>

      <div class="mt-auto flex items-center justify-between gap-3 border-t border-border-hairline pt-3 text-xs text-text-subtle">
        <span class="min-w-0 flex-1 truncate">{props.term}</span>
        <span class="flex min-w-0 items-center gap-1.5">
          <IconUsers class="h-3.5 w-3.5 shrink-0" />
          <span class="max-w-32 truncate">{teachers().map(personLabel).join(", ")}</span>
        </span>
      </div>

      <div class="flex items-center gap-2 rounded-lg bg-surface-tint px-3 py-2 text-xs text-text-subtle">
        <IconBook class="h-3.5 w-3.5 shrink-0" />
        <span class="font-medium text-text-default">{props.labels.capacity}:</span>
        <span class="tabular-nums">{props.course.capacity ?? props.labels.unlimited}</span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-hairline px-3 py-2">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-subtle">
          <span class="flex items-center gap-1"><IconClock class="h-3 w-3 shrink-0" />{props.labels.weeklyHours}</span>
          <span class="flex items-center gap-1"><IconTarget class="h-3 w-3 shrink-0" />{props.labels.competency}</span>
          <span class="flex items-center gap-1"><IconClipboardCheck class="h-3 w-3 shrink-0" />{props.labels.attendance}</span>
          <span>{props.labels.progress}</span>
        </div>
        <ComingSoonBadge />
      </div>

      <Show when={props.showTeacherActions}>
        <div class="flex flex-wrap items-center gap-2 border-t border-border-hairline pt-3">
          <Button size="sm" variant="outline" disabled class="h-[26px] rounded-lg px-2.5 text-xs">{props.labels.takeAttendance}</Button>
          <Button size="sm" variant="outline" disabled class="h-[26px] rounded-lg px-2.5 text-xs">{props.labels.analysis}</Button>
          <ComingSoonBadge class="ml-auto" />
        </div>
      </Show>
    </Link>
  );
}
