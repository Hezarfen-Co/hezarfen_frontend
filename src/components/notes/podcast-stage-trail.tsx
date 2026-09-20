import { For, createSignal, onCleanup } from "solid-js";
import { cn } from "@/lib/cn";
import { formatDurationClock } from "@/lib/format";

export type PodcastStageEntry = {
  /** The service's own stage name, stored as it came. */
  stage: string;
  /** When this client first saw the job in that stage, epoch ms. */
  at: number;
};

const TICK_MS = 1_000;

/**
 * The stages a job has passed through, newest last, each with the time it took.
 *
 * The backend reports one current stage per poll, never a list with durations,
 * so the trail is what *this client observed*: a row is added when the reported
 * stage changes, and a stage's time is the gap to the next observation. A job
 * picked back up after a reload therefore starts its trail where it was found —
 * inventing the steps before that would be making up a history we never saw.
 */
export function PodcastStageTrail(props: { entries: PodcastStageEntry[]; live: boolean; label: string }) {
  const [now, setNow] = createSignal(Date.now());
  const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
  onCleanup(() => window.clearInterval(timer));

  // The last row is still running while the job is live, so it measures against
  // the clock; every earlier row is closed by the row that replaced it.
  const spanOf = (index: number) => {
    const entries = props.entries;
    const start = entries[index]!.at;
    const next = entries[index + 1];
    if (next) return next.at - start;
    return props.live ? Math.max(0, now() - start) : null;
  };

  return (
    <div class="space-y-1.5">
      <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{props.label}</p>
      <ol class="divide-y divide-border-hairline border-y border-border-hairline">
        <For each={props.entries}>
          {(entry, index) => {
            const running = () => props.live && index() === props.entries.length - 1;
            return (
              <li class="flex items-center gap-2.5 py-1.5 text-xs">
                <span
                  class={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    running() ? "animate-pulse bg-primary" : "bg-muted-foreground/50",
                  )}
                />
                <span class={cn("min-w-0 flex-1 truncate", running() ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {entry.stage}
                </span>
                <span class="shrink-0 tabular-nums text-muted-foreground">
                  {spanOf(index()) == null ? "—" : formatDurationClock(spanOf(index())!)}
                </span>
              </li>
            );
          }}
        </For>
      </ol>
    </div>
  );
}
