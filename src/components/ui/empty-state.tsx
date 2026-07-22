import { Show } from "solid-js";
import { cn } from "@/lib/cn";

export type EmptyStateKind = "default" | "notes" | "exams" | "events" | "courses";

const KIND_TONE: Record<EmptyStateKind, string> = {
  default: "border-primary/20 bg-primary/10 text-primary",
  notes: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  exams: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  events: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  courses: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

/** Clean dashed empty panel with animated vector illustrations. */
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
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-8 text-center transition-all duration-300",
        props.class,
      )}
    >
      <div class={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner", KIND_TONE[kind()])}>
        <Show when={kind() === "notes"}>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h8" />
            <circle cx="18" cy="18" r="2.5" class="fill-current opacity-30" />
          </svg>
        </Show>
        <Show when={kind() === "exams"}>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="m9 15 2 2 4-4" />
          </svg>
        </Show>
        <Show when={kind() === "events"}>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
        </Show>
        <Show when={kind() === "default" || kind() === "courses"}>
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </Show>
      </div>

      <div class="space-y-1">
        <p class="text-sm font-semibold text-foreground">{props.title}</p>
        <Show when={props.description}>
          <p class="max-w-sm text-xs leading-relaxed text-muted-foreground">{props.description}</p>
        </Show>
      </div>
    </div>
  );
}
