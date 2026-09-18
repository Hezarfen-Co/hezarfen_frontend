import { Show } from "solid-js";
import type { Note } from "@/api/client";
import type { NoteFileSource } from "@/lib/note-source";
import { NoteFilesPanel } from "@/components/notes/note-files-panel";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { SidePanel } from "@/components/ui/side-panel";
import { toRichTextHtml } from "@/lib/rich-text";
import { useT } from "@/stores/preferences-context";

export function NoteReaderPanel(props: {
  note: Note | null;
  source: NoteFileSource;
  /** Read-only file section when false. Defaults to true. */
  canManage?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const note = () => props.note;

  return (
    <SidePanel
      open={props.open && note() != null}
      onOpenChange={props.onOpenChange}
      title={note()?.title ?? t("notes.title")}
      size="wide"
    >
      <Show when={note()}>
        {(n) => (
          <div class="space-y-4">
            <article class="rounded-xl border border-border bg-card px-5 py-5 shadow-xs sm:px-7">
              <Show
                when={note()?.content?.trim()}
                fallback={<p class="text-sm italic text-muted-foreground">{t("notes.noContent")}</p>}
              >
                <div class="note-prose" innerHTML={toRichTextHtml(note()?.content)} />
              </Show>
            </article>
            <NoteFilesPanel noteId={n().id} source={props.source} canManage={props.canManage} active={props.open} />
            <Show when={props.source.listRagOutputs}>
              <RagOutputsPanel noteId={n().id} source={props.source} canManage={props.canManage} active={props.open} noteTitle={n().title} />
              <PodcastPanel noteId={n().id} active={props.open} />
            </Show>
          </div>
        )}
      </Show>
    </SidePanel>
  );
}
