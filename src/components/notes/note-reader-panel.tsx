import { For, Show, createMemo } from "solid-js";
import type { Note } from "@/api/types";
import { NoteFilesPanel } from "@/components/notes/note-files-panel";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

export function NoteReaderPanel(props: {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const note = () => props.note;
  const paragraphs = createMemo(() =>
    (note()?.content ?? "")
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean),
  );

  return (
    <SidePanel
      open={props.open && note() != null}
      onOpenChange={props.onOpenChange}
      title={note()?.title ?? t("notes.title")}
      description={t("notes.subtitle")}
      size="wide"
    >
      <Show when={note()}>
        {(n) => (
          <div class="space-y-4">
            <article class="overflow-hidden rounded-2xl border border-amber-200/70 bg-[linear-gradient(90deg,rgba(245,158,11,0.14)_0,rgba(245,158,11,0.14)_3rem,transparent_3rem),repeating-linear-gradient(0deg,transparent_0,transparent_2.45rem,rgba(120,113,108,0.16)_2.5rem)] shadow-sm dark:border-amber-500/20 dark:bg-[linear-gradient(90deg,rgba(245,158,11,0.12)_0,rgba(245,158,11,0.12)_3rem,transparent_3rem),repeating-linear-gradient(0deg,transparent_0,transparent_2.45rem,rgba(214,211,209,0.12)_2.5rem)]">
              <div class="min-h-80 space-y-4 px-5 py-5 pl-16">
                <Show
                  when={paragraphs().length > 0}
                  fallback={<p class="text-sm italic leading-8 text-muted-foreground">{t("notes.noContent")}</p>}
                >
                  <For each={paragraphs()}>
                    {(paragraph) => <p class="whitespace-pre-wrap text-sm leading-8 text-foreground">{paragraph}</p>}
                  </For>
                </Show>
              </div>
            </article>
            <NoteFilesPanel noteId={n().id} active={props.open} />
          </div>
        )}
      </Show>
    </SidePanel>
  );
}
