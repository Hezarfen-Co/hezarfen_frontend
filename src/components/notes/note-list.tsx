import { For, Show, createSignal, type JSX } from "solid-js";
import type { Note } from "@/api/types";
import { NoteCard } from "@/components/notes/note-card";
import { NoteReaderPanel } from "@/components/notes/note-reader-panel";
import { EmptyState } from "@/components/ui/empty-state";

export function NoteList(props: {
  notes: Note[];
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: JSX.Element;
  onUpdate: (id: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [readingNote, setReadingNote] = createSignal<Note | null>(null);

  return (
    <>
      <Show
        when={props.notes.length > 0}
        fallback={
          <EmptyState
            title={props.emptyTitle}
            description={props.emptyDescription}
            action={props.emptyAction}
          />
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
