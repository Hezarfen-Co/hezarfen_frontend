import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { PodcastTranscriptSegment } from "@/api/client";
import { cn } from "@/lib/cn";
import { formatDurationClock } from "@/lib/format";
import { useT } from "@/stores/preferences-context";

/** Index of the segment playing at `secs`, or -1 before the first one starts. */
export function activeSegmentIndex(segments: PodcastTranscriptSegment[], secs: number): number {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid].start_secs <= secs) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * The episode's timed transcript, following playback: the line being spoken
 * is highlighted and kept in view, and clicking any line plays from there.
 * Scrolling the list by hand stops the follow until the reader asks for it
 * back, so reading ahead is never yanked away.
 */
export function PodcastTranscript(props: {
  segments: PodcastTranscriptSegment[];
  currentSecs: number;
  onSeek: (secs: number) => void;
}) {
  const t = useT();
  let list!: HTMLOListElement;
  const [following, setFollowing] = createSignal(true);
  // Set around our own scrolls so the scroll handler can tell them apart from
  // the reader's.
  let autoScrolling = false;
  const active = createMemo(() => activeSegmentIndex(props.segments, props.currentSecs));

  const scrollToActive = (behavior: ScrollBehavior) => {
    const row = list?.children[active()] as HTMLElement | undefined;
    if (!row) return;
    autoScrolling = true;
    list.scrollTo({ top: row.offsetTop - list.clientHeight / 3, behavior });
    window.setTimeout(() => (autoScrolling = false), behavior === "smooth" ? 400 : 0);
  };

  createEffect(() => {
    active();
    if (following()) scrollToActive("smooth");
  });

  return (
    <div class="relative">
      <ol
        ref={list}
        class="relative max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-border-hairline bg-surface-base p-1.5"
        aria-label={t("podcast.transcript.title")}
        onScroll={() => {
          if (!autoScrolling) setFollowing(false);
        }}
      >
        <For each={props.segments}>
          {(segment, index) => (
            <li>
              <button
                type="button"
                class={cn(
                  "flex w-full gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  index() === active() ? "bg-primary/10 text-foreground" : "text-muted-foreground",
                )}
                aria-current={index() === active() ? "true" : undefined}
                aria-label={t("podcast.transcript.seek", { time: formatDurationClock(segment.start_secs * 1000) })}
                onClick={() => {
                  setFollowing(true);
                  props.onSeek(segment.start_secs);
                }}
              >
                <span class="mt-px shrink-0 text-[11px] tabular-nums text-text-subtle">
                  {formatDurationClock(segment.start_secs * 1000)}
                </span>
                <span class="min-w-0 flex-1 leading-relaxed">
                  <Show when={segment.speaker}>
                    {(speaker) => <span class="mr-1.5 font-semibold text-foreground">{speaker()}:</span>}
                  </Show>
                  {segment.text}
                </span>
              </button>
            </li>
          )}
        </For>
      </ol>
      <Show when={!following() && active() >= 0}>
        <button
          type="button"
          class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border-line bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-muted"
          onClick={() => {
            setFollowing(true);
            scrollToActive("smooth");
          }}
        >
          {t("podcast.transcript.follow")}
        </button>
      </Show>
    </div>
  );
}
