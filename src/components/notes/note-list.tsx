import { For, Show, createSignal } from "solid-js";
import type { Note } from "@/api/types";
import { NoteCard } from "@/components/notes/note-card";
import { NoteReaderPanel } from "@/components/notes/note-reader-panel";

export function NoteList(props: {
  notes: Note[];
  emptyLabel?: string;
  onUpdate: (id: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [readingNote, setReadingNote] = createSignal<Note | null>(null);

  return (
    <>
      <Show
        when={props.notes.length > 0}
        fallback={
          <div class="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            {props.emptyLabel ?? ""}
          </div>
        }
      >
        <ul class="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <For each={props.notes}>
            {(note) => (
              <li class="animate-fade-up">
                <NoteCard
                  note={note}
                  onOpen={setReadingNote}
                  onUpdate={props.onUpdate}
                  onDelete={props.onDelete}
                />
              </li>
            )}
          </For>
        </ul>
      </Show>

      <NoteReaderPanel
        note={readingNote()}
        open={readingNote() != null}
        onOpenChange={(open) => {
          if (!open) setReadingNote(null);
        }}
      />
    </>
  );
}
