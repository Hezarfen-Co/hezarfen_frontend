import { Show } from "solid-js";
import { cn } from "@/lib/cn";
import { DOMAIN_COLORS } from "@/lib/domain-colors";

export type EmptyStateKind = "default" | "notes" | "exams" | "events" | "courses" | "messages" | "meals";

const KIND_TONE: Record<EmptyStateKind, string> = {
  default: "border-primary/40 ring-1 ring-primary/25 bg-muted/30 text-foreground",
  notes: DOMAIN_COLORS.notes.emptyStateClass,
  exams: DOMAIN_COLORS.exams.emptyStateClass,
  events: DOMAIN_COLORS.events.emptyStateClass,
  courses: DOMAIN_COLORS.courses.emptyStateClass,
  messages: DOMAIN_COLORS.messages.emptyStateClass,
  meals: "border-amber-500/40 ring-1 ring-amber-500/25 bg-muted/30 text-foreground",
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
        "flex min-h-[289px] flex-col items-center justify-center gap-5 rounded-xl border border-border-hairline bg-surface-base px-10 py-14 text-center transition-all duration-300",
        props.class,
      )}
    >
      <div class={cn("relative flex h-14 w-14 items-center justify-center rounded-lg border", KIND_TONE[kind()])}>
        <Show when={kind() === "notes"}>
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h8" />
            <circle cx="18" cy="18" r="2.5" class="fill-current opacity-30" />
          </svg>
        </Show>
        <Show when={kind() === "exams"}>
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="m9 15 2 2 4-4" />
          </svg>
        </Show>
        <Show when={kind() === "events"}>
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
        </Show>
        <Show when={kind() === "meals"}>
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20" />
            <path d="M15 2v20M15 8c0-3.3 1.3-6 4-6v20" />
          </svg>
        </Show>
        <Show when={kind() === "default" || kind() === "courses"}>
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </Show>
      </div>

      <div class="space-y-2">
        <p class="text-xl font-semibold leading-8 tracking-[-0.025em] text-text-strong sm:text-2xl">{props.title}</p>
        <Show when={props.description}>
          <p class="max-w-[420px] text-sm leading-[21px] text-text-subtle">{props.description}</p>
        </Show>
      </div>
    </div>
  );
}
