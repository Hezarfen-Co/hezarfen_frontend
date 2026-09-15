import { Show } from "solid-js";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/cn";
import type { IllustrationName } from "@/lib/illustrations";

export type EmptyStateKind =
  | "default"
  | "search"
  | "notes"
  | "exams"
  | "events"
  | "courses"
  | "messages"
  | "meals"
  | "homework"
  | "payments"
  | "people"
  | "schedule"
  | "whiteboard"
  | "work"
  | "coming-soon";

const KIND_ILLUSTRATION: Record<EmptyStateKind, IllustrationName> = {
  default: "empty",
  search: "no-results",
  notes: "notes",
  exams: "exams",
  events: "events",
  courses: "courses",
  messages: "messages",
  meals: "meals",
  homework: "homework",
  payments: "payments",
  people: "people",
  schedule: "schedule",
  whiteboard: "whiteboard",
  work: "work",
  "coming-soon": "coming-soon",
};

/** Empty panel with a theme-tinted illustration matching what is missing. */
export function EmptyState(props: {
  title: string;
  description?: string;
  kind?: EmptyStateKind;
  class?: string;
}) {
  const kind = () => props.kind ?? "default";

  return (
    <div
      class={cn(
        "flex min-h-[289px] flex-col items-center justify-center gap-5 rounded-xl border border-border-hairline bg-surface-base px-10 py-12 text-center",
        props.class,
      )}
    >
      <Illustration name={KIND_ILLUSTRATION[kind()]} class="h-32 w-48 sm:h-36 sm:w-56" />

      <div class="space-y-1.5">
        <p class="text-lg font-semibold leading-7 tracking-[-0.015em] text-text-strong">{props.title}</p>
        <Show when={props.description}>
          <p class="mx-auto max-w-[420px] text-sm leading-[21px] text-text-subtle">{props.description}</p>
        </Show>
      </div>
    </div>
  );
}
