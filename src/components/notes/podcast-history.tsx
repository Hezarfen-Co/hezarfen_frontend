import { For, Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import { listPodcastJobs, podcastAudioUrl } from "@/api/podcast";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-inline";
import { PageSpinner } from "@/components/ui/page-spinner";
import { IconDownload, IconWaveform } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { formatDate, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const HISTORY_PAGE_SIZE = 10;

/**
 * The caller's own episodes, under the Ses Atölyesi panel. One-directional:
 * the studio produces, this only reads. A finished episode plays through the
 * same job-id audio door the panel's own player uses.
 *
 * The list always follows the note selected in the studio. There is no second
 * global-history scope here: the podcast tab is about the current note.
 */
export function PodcastHistory(props: { noteId?: string; active?: boolean; refetchKey?: string | number }) {
  const t = useT();
  const downloadT = usePodcastDownloadT();
  const { locale } = usePreferences();
  const [playing, setPlaying] = createSignal("");
  const active = () => props.active !== false;

  // The source is the scope string, not a fresh object: an identity-stable
  // value keeps the resource from refetching when nothing about it changed.
  const [list, { refetch }] = createResource(
    () => (active() ? props.noteId ?? null : null),
    (noteId) => listPodcastJobs({ limit: HISTORY_PAGE_SIZE, sourceId: noteId }),
  );

  // The panel bumps the key ("", then the job id) when a generation finishes;
  // pull a fresh page so the episode it just produced appears. The history
  // never starts work itself.
  createEffect(() => {
    if (props.refetchKey) void refetch();
  });

  const jobs = () => list()?.items ?? [];

  const stateVariant = (state: string) => {
    if (state === "done") return "success" as const;
    if (state === "failed") return "destructive" as const;
    if (state === "cancelled") return "secondary" as const;
    return "warning" as const;
  };
  const stateLabel = (state: string) => {
    if (state === "done") return t("podcast.history.state.done");
    if (state === "failed") return t("podcast.history.state.failed");
    if (state === "cancelled") return t("podcast.history.state.cancelled");
    return t("podcast.history.state.pending");
  };

  return (
    <div class="space-y-3 border-t border-border-line pt-4">
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 class="text-sm font-semibold">{t("podcast.history.title")}</h3>
      </div>

      <Show when={list.error}>
        <Alert variant="destructive">{formatApiError(list.error)}</Alert>
      </Show>

      <Show when={!list.error}>
        <Suspense fallback={<PageSpinner />}>
          <Show
            when={jobs().length > 0}
            fallback={
              <EmptyInline
                title={
                  props.noteId
                    ? t("podcast.history.emptyNote")
                    : t("podcast.history.empty")
                }
                hint={t("podcast.history.emptyHint")}
              />
            }
          >
            <ul class="space-y-2">
              <For each={jobs()}>
                {(row) => (
                  <li class="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium">{row.source_title ?? row.source_id}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={stateVariant(row.state)}>{stateLabel(row.state)}</Badge>
                        <Show when={row.state === "failed" && row.error_code}>
                          <span class="mono">{row.error_code}</span>
                        </Show>
                        <span>{formatDate(row.created_at, locale())}</span>
                        <Show when={row.duration_secs != null}>
                          <span class="tabular-nums">{formatDurationClock((row.duration_secs ?? 0) * 1000)}</span>
                        </Show>
                      </div>
                    </div>
                    <Show when={row.state === "done"}>
                      <div class="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          class="shrink-0 rounded-lg"
                          aria-label={t("podcast.history.play")}
                          onClick={() => setPlaying(row.job_id)}
                        >
                          <IconWaveform class="h-4 w-4" />
                        </Button>
                        <a
                          href={podcastAudioUrl(row.job_id)}
                          download={podcastDownloadFilename(
                            row.source_title ?? row.source_id,
                            downloadT("podcast.download.fallback"),
                          )}
                          aria-label={downloadT("podcast.download.aria")}
                          class={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-lg")}
                        >
                          <IconDownload class="h-4 w-4" />
                          {downloadT("podcast.download.label")}
                        </a>
                      </div>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Suspense>
      </Show>

      <Show when={playing()}>
        <audio class="w-full" controls autoplay preload="metadata" src={podcastAudioUrl(playing())}>
          {t("podcast.audioUnsupported")}
        </audio>
      </Show>
    </div>
  );
}
