import { For, Show, Suspense, createMemo } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNoteRag } from "@/api/course-notes";
import { listPodcastJobs } from "@/api/podcast";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconNote, IconSparkles, IconWaveform } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export type StudioLibraryNote = {
  id: string;
  title: string;
  courseTitle: string;
};

type StudioLibraryItem = StudioLibraryNote & {
  podcastCount: number;
  hasSummary: boolean;
  latestAt: number;
};

const LIBRARY_LIMIT = 100;

export function StudioOutputLibrary(props: {
  notes: StudioLibraryNote[];
  selectedId: string;
  onSelect: (noteId: string) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const source = createMemo(() => props.notes.map((note) => note.id).join(","));
  const [items] = createResource(source, async (): Promise<StudioLibraryItem[]> => {
    const [podcastResult, ...summaryResults] = await Promise.allSettled([
      listPodcastJobs({ limit: LIBRARY_LIMIT }),
      ...props.notes.map((note) => getCourseNoteRag(note.id, { limit: 1 })),
    ]);
    const podcasts = podcastResult.status === "fulfilled" ? podcastResult.value.items : [];
    const podcastsByNote = new Map<string, { count: number; latestAt: number }>();

    for (const podcast of podcasts) {
      if (podcast.state !== "done") continue;
      const current = podcastsByNote.get(podcast.source_id) ?? { count: 0, latestAt: 0 };
      podcastsByNote.set(podcast.source_id, {
        count: current.count + 1,
        latestAt: Math.max(current.latestAt, podcast.finished_at ?? podcast.created_at),
      });
    }

    return props.notes
      .map((note, index): StudioLibraryItem | null => {
        const summaryResult = summaryResults[index];
        const summary = summaryResult?.status === "fulfilled" ? summaryResult.value.items[0] : undefined;
        const podcast = podcastsByNote.get(note.id);
        if (!summary && !podcast) return null;
        return {
          ...note,
          podcastCount: podcast?.count ?? 0,
          hasSummary: !!summary,
          latestAt: Math.max(summary?.generated_at ?? 0, podcast?.latestAt ?? 0),
        };
      })
      .filter((item): item is StudioLibraryItem => item != null)
      .sort((a, b) => b.latestAt - a.latestAt);
  });

  return (
    <section class="overflow-hidden rounded-xl border border-border-line bg-surface-base">
      <header class="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-hairline px-4 py-3">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-text-strong">{t("aiStudio.library.title")}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">{t("aiStudio.library.description")}</p>
        </div>
        <Show when={(items()?.length ?? 0) > 0}>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
            {t("aiStudio.library.count", { count: items()?.length ?? 0 })}
          </span>
        </Show>
      </header>

      <Suspense fallback={<div class="py-8"><PageSpinner /></div>}>
        <Show
          when={(items()?.length ?? 0) > 0}
          fallback={
            <div class="px-4 py-5 sm:px-5">
              <EmptyInline title={t("aiStudio.library.empty")} hint={t("aiStudio.library.emptyHint")} />
            </div>
          }
        >
          {/* Studio's own working screens are flat, dense lists rather than
              card grids: hairline dividers, one row per thing, and the active
              row marked by an accent edge instead of a box of its own. */}
          <ul class="divide-y divide-border-hairline">
            <For each={items()}>
              {(item) => (
                <li>
                  <button
                    type="button"
                    aria-current={props.selectedId === item.id ? "true" : undefined}
                    class={cn(
                      "flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left outline-hidden transition-colors hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      props.selectedId === item.id
                        ? "border-l-primary bg-primary/[0.04]"
                        : "border-l-transparent",
                    )}
                    onClick={() => props.onSelect(item.id)}
                  >
                    <span class="shrink-0 text-muted-foreground">
                      <Show when={item.podcastCount > 0} fallback={<IconNote class="h-4 w-4" />}>
                        <IconWaveform class="h-4 w-4" />
                      </Show>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-text-strong">{item.title}</span>
                      <span class="mt-0.5 block truncate text-xs text-muted-foreground">{item.courseTitle}</span>
                    </span>
                    <span class="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <Show when={item.hasSummary}>
                        <Badge variant="outline" class="gap-1 rounded-md font-normal">
                          <IconSparkles class="h-3 w-3" />
                          {t("aiStudio.library.summary")}
                        </Badge>
                      </Show>
                      <Show when={item.podcastCount > 0}>
                        <Badge variant="outline" class="gap-1 rounded-md font-normal">
                          <IconWaveform class="h-3 w-3" />
                          {t("aiStudio.library.podcastCount", { count: item.podcastCount })}
                        </Badge>
                      </Show>
                    </span>
                    <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDate(item.latestAt, locale())}
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Suspense>
    </section>
  );
}
