import { Show, createSignal } from "solid-js";
import { getPodcastJobAudioBlob, podcastAudioUrl } from "@/api/podcast";
import type { PodcastTranscriptSegment } from "@/api/client";
import { AudioPlayer, type AudioPlayerController } from "@/components/ui/audio-player";
import { IconDownload, IconTranscript } from "@/components/ui/icons";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { PodcastTranscript } from "@/components/notes/podcast-transcript";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/**
 * One produced episode: the app's audio player on the job's stream, its
 * download, and — once the backend sends one — the timed transcript under
 * it. With no transcript there is no toggle at all rather than an empty one.
 */
export function PodcastPlayer(props: {
  jobId: string;
  title?: string;
  subtitle?: string;
  durationSecs?: number | null;
  transcript?: PodcastTranscriptSegment[] | null;
  autoplay?: boolean;
  /** Off where the surrounding row already offers the download. */
  download?: boolean;
  /** The download's filename stem; defaults to the title. */
  downloadName?: string;
  class?: string;
}) {
  const t = useT();
  const downloadT = usePodcastDownloadT();
  const [currentSecs, setCurrentSecs] = createSignal(0);
  const [transcriptOpen, setTranscriptOpen] = createSignal(false);
  let controller: AudioPlayerController | undefined;
  const segments = () => props.transcript ?? [];

  return (
    <div class={cn("space-y-2", props.class)}>
      <AudioPlayer
        src={podcastAudioUrl(props.jobId)}
        title={props.title}
        subtitle={props.subtitle}
        durationHint={props.durationSecs}
        loadBlob={(signal) => getPodcastJobAudioBlob(props.jobId, signal)}
        autoplay={props.autoplay}
        onTimeUpdate={setCurrentSecs}
        controller={(value) => (controller = value)}
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
          <Show when={segments().length > 0}>
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
      <Show when={transcriptOpen() && segments().length > 0}>
        <PodcastTranscript
          segments={segments()}
          currentSecs={currentSecs()}
          onSeek={(secs) => {
            controller?.seek(secs);
            controller?.play();
          }}
        />
      </Show>
    </div>
  );
}
