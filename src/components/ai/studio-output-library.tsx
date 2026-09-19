import { For, Show, Suspense, createMemo } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNoteRag } from "@/api/course-notes";
import { listPodcastJobs } from "@/api/podcast";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconChevronRight, IconNote, IconSparkles, IconWaveform } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

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
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border-hairline px-4 py-4 sm:px-5">
        <div class="flex min-w-0 items-start gap-3">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-text-strong">{t("aiStudio.library.title")}</h2>
            <p class="mt-0.5 text-xs text-muted-foreground">{t("aiStudio.library.description")}</p>
          </div>
        </div>
        <Show when={(items()?.length ?? 0) > 0}>
          <Badge variant="secondary" class="rounded-md">
            {t("aiStudio.library.count", { count: items()?.length ?? 0 })}
          </Badge>
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
          <ul class="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            <For each={items()}>
              {(item) => (
                <li>
                  <button
                    type="button"
                    aria-current={props.selectedId === item.id ? "true" : undefined}
                    class={cn(
                      "group flex h-full w-full flex-col rounded-xl border bg-background p-4 text-left outline-hidden transition-colors hover:border-primary/35 hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring",
                      props.selectedId === item.id ? "border-primary/40 bg-primary/[0.035]" : "border-border-hairline",
                    )}
                    onClick={() => props.onSelect(item.id)}
                  >
                    <div class="flex w-full items-start gap-3">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                        <Show when={item.podcastCount > 0} fallback={<IconNote class="h-4 w-4" />}>
                          <IconWaveform class="h-4 w-4" />
                        </Show>
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-text-strong">{item.title}</p>
                        <p class="mt-0.5 truncate text-xs text-muted-foreground">{item.courseTitle}</p>
                      </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-1.5">
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
                    </div>

                    <span class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary-text">
                      {t("aiStudio.library.open")}
                      <IconChevronRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
