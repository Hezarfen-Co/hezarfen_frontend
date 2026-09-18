import { For, Show } from "solid-js";
import type { RagCitation } from "@/api/client";
import { IconBook, IconFileText } from "@/components/ui/icons";

export function RagCitations(props: {
  citations: RagCitation[];
  labels: { sources: string; source: string; subject: string; pages: string; document: string };
}) {
  return (
    <Show when={props.citations.length > 0}>
      <div class="mt-3 border-t border-border/60 pt-3">
        <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {props.labels.sources}
        </p>
        <ol class="grid gap-2 sm:grid-cols-2">
          <For each={props.citations}>
            {(citation) => (
              <li class="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1 font-mono font-semibold text-primary-text">
                    {citation.n}
                  </span>
                  <div class="min-w-0 space-y-1">
                    <p class="flex items-center gap-1.5 font-medium text-foreground">
                      <Show when={citation.ders} fallback={<IconFileText class="h-3.5 w-3.5" />}>
                        <IconBook class="h-3.5 w-3.5" />
                      </Show>
                      <span class="truncate">{citation.ders || props.labels.document}</span>
                    </p>
                    <Show when={citation.pages.length > 0}>
                      <p class="text-muted-foreground">
                        {props.labels.pages}: <span class="tabular-nums">{citation.pages.join(", ")}</span>
                      </p>
                    </Show>
                  </div>
                </div>
              </li>
            )}
          </For>
        </ol>
      </div>
    </Show>
  );
}
