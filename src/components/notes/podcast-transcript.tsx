import { For } from "solid-js";
import { useT } from "@/stores/preferences-context";

/** The transcript's chapters: the backend joins them with blank lines. */
export function transcriptChapters(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((chapter) => chapter.trim())
    .filter(Boolean);
}

/**
 * The episode's transcript, one paragraph per chapter. The backend sends it
 * without timings, so it reads alongside playback rather than following it.
 */
export function PodcastTranscript(props: { chapters: string[] }) {
  const t = useT();
  return (
    <div
      class="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border-hairline bg-surface-base px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
      role="region"
      aria-label={t("podcast.transcript.title")}
      tabindex="0"
    >
      <For each={props.chapters}>{(chapter) => <p class="whitespace-pre-line">{chapter}</p>}</For>
    </div>
  );
}
