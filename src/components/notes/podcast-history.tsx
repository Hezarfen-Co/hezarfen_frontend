import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { listPodcastJobs, podcastAudioUrl } from "@/api/podcast";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-inline";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { IconDownload, IconWaveform } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { formatDate, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const HISTORY_PAGE_SIZE = 10;

// The three narrations the service produces. It settles the format on its first
// report, so a live job often carries none yet, and a format this build has no
// label for is shown verbatim rather than dropped.
const FORMAT_KEYS: Record<string, MessageKey> = {
  duz_okuma: "podcast.format.duz_okuma",
  tek_ogretici: "podcast.format.tek_ogretici",
  ogrenci_hoca: "podcast.format.ogrenci_hoca",
};

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
  const [page, setPage] = createSignal(0);
  const pageSize = createResponsivePageSize(HISTORY_PAGE_SIZE);
  const active = () => props.active !== false;

  createEffect(() => {
    props.noteId;
    pageSize();
    setPage(0);
  });

  // The source is the scope string, not a fresh object: an identity-stable
  // value keeps the resource from refetching when nothing about it changed.
  const source = createMemo(() => (active() && props.noteId ? { noteId: props.noteId, page: page(), size: pageSize() } : null));
  const [list, { refetch }] = createResource(
    source,
    (scope) => listPodcastJobs({ limit: scope.size, offset: scope.page * scope.size, sourceId: scope.noteId }),
  );

  // The panel bumps the key ("", then the job id) when a generation finishes;
  // pull a fresh page so the episode it just produced appears. The history
  // never starts work itself.
  createEffect(() => {
    if (props.refetchKey) void refetch();
  });

  const jobs = () => list()?.items ?? [];
  const totalPages = createMemo(() => Math.max(1, Math.ceil((list()?.total ?? 0) / pageSize())));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  createEffect(() => {
    if (page() > totalPages() - 1) setPage(totalPages() - 1);
  });

  const stateVariant = (state: string) => {
    if (state === "done") return "success" as const;
    if (state === "failed") return "destructive" as const;
    if (state === "cancelled") return "secondary" as const;
    return "warning" as const;
  };
  const formatLabel = (format: string | null) => {
    if (!format) return "";
    const key = FORMAT_KEYS[format];
    return key ? t(key) : format;
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
                  <li class="rounded-lg border border-border/60 p-3">
                    <div class="flex items-center gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium">{row.source_title ?? row.source_id}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={stateVariant(row.state)}>{stateLabel(row.state)}</Badge>
                        <Show when={formatLabel(row.format)}>
                          {(label) => <Badge variant="outline">{label()}</Badge>}
                        </Show>
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
                    </div>
                    {/* The player opens in the row the reader clicked. A single
                        one under the whole list put it a screen away from the
                        episode it belonged to. */}
                    <Show when={playing() === row.job_id}>
                      <audio class="mt-3 w-full" controls autoplay preload="metadata" src={podcastAudioUrl(row.job_id)}>
                        {t("podcast.audioUnsupported")}
                      </audio>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={(list()?.total ?? 0) > pageSize()}>
            <TablePagination pageIndex={safePage()} pageCount={totalPages()} onPageChange={setPage} />
          </Show>
        </Suspense>
      </Show>

    </div>
  );
}
