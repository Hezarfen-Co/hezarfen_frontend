import { For, Show, createSignal } from "solid-js";
import type { Note } from "@/api/client";
import type { NoteFileSource } from "@/lib/note-source";
import { NoteCard } from "@/components/notes/note-card";
import { NoteReaderPanel } from "@/components/notes/note-reader-panel";
import { EmptyState } from "@/components/ui/empty-state";

export function NoteList(props: {
  notes: Note[];
  /** Which note family these belong to — decides the file routes behind them. */
  source: NoteFileSource;
  /** Hides edit/delete and the file controls when false. Defaults to true. */
  canManage?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  /** Opens a note somewhere else (its own page) instead of the reader panel; also used for edit. */
  onOpen?: (note: Note) => void;
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
            kind="notes"
            title={props.emptyTitle}
            description={props.emptyDescription}
          />
        }
      >
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <For each={props.notes}>
            {(note) => (
              <li class="animate-fade-up">
                <NoteCard
                  note={note}
                  canManage={props.canManage}
                  onOpen={(item) => (props.onOpen ? props.onOpen(item) : setReadingNote(item))}
                  onEdit={props.onOpen}
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
        source={props.source}
        canManage={props.canManage}
        open={readingNote() != null}
        onOpenChange={(open) => {
          if (!open) setReadingNote(null);
        }}
      />
    </>
  );
}
