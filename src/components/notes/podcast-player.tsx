import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { getPodcastJobAudioBlob, getPodcastJobResultById, podcastAudioUrl } from "@/api/podcast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { IconDownload, IconTranscript } from "@/components/ui/icons";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { PodcastTranscript, transcriptChapters } from "@/components/notes/podcast-transcript";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/**
 * One produced episode: the app's audio player on the job's stream, its
 * download, and the transcript under it when the job's result carries one.
 * With no transcript there is no toggle at all rather than an empty one.
 */
export function PodcastPlayer(props: {
  jobId: string;
  title?: string;
  subtitle?: string;
  durationSecs?: number | null;
  autoplay?: boolean;
  /** Off where the surrounding row already offers the download. */
  download?: boolean;
  /** The download's filename stem; defaults to the title. */
  downloadName?: string;
  class?: string;
}) {
  const t = useT();
  const downloadT = usePodcastDownloadT();
  const [transcriptOpen, setTranscriptOpen] = createSignal(false);
  const [chapters, setChapters] = createSignal<string[]>([]);
  // Read from the job's result rather than a resource: the player sits inside
  // the history's <Suspense>, and a missing transcript must not hold the audio
  // back. A failed read only means no transcript control.
  createEffect(() => {
    const jobId = props.jobId;
    const controller = new AbortController();
    setChapters([]);
    setTranscriptOpen(false);
    getPodcastJobResultById(jobId, controller.signal)
      .then((result) => setChapters(transcriptChapters(result.transcript)))
      .catch(() => {});
    onCleanup(() => controller.abort());
  });

  return (
    <div class={cn("space-y-2", props.class)}>
      <AudioPlayer
        src={podcastAudioUrl(props.jobId)}
        title={props.title}
        subtitle={props.subtitle}
        durationHint={props.durationSecs}
        loadBlob={(signal) => getPodcastJobAudioBlob(props.jobId, signal)}
        autoplay={props.autoplay}
        actions={
          <Show when={props.download !== false}>
            <a
              href={podcastAudioUrl(props.jobId)}
              download={podcastDownloadFilename(props.downloadName ?? props.title, downloadT("podcast.download.fallback"))}
              aria-label={downloadT("podcast.download.aria")}
              title={downloadT("podcast.download.label")}
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconDownload class="h-4 w-4" />
            </a>
          </Show>
        }
        extra={
          <Show when={chapters().length > 0}>
            <button
              type="button"
              class={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                transcriptOpen() ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-expanded={transcriptOpen()}
              aria-label={transcriptOpen() ? t("podcast.transcript.hide") : t("podcast.transcript.show")}
              onClick={() => setTranscriptOpen(!transcriptOpen())}
            >
              <IconTranscript class="h-4 w-4" />
              <span class="hidden sm:inline">{t("podcast.transcript.title")}</span>
            </button>
          </Show>
        }
      />
      <Show when={transcriptOpen() && chapters().length > 0}>
        <PodcastTranscript chapters={chapters()} />
      </Show>
    </div>
  );
}
