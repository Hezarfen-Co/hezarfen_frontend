import { createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Note } from "@/api/types";
import { NoteForm } from "@/components/notes/note-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconTrash } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

export function NoteCard(props: {
  note: Note;
  onUpdate: (id: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [deleteOpen, setDeleteOpen] = createSignal(false);

  return (
    <article class="surface-card flex h-full flex-col overflow-hidden">
      <div class="flex items-start justify-between gap-2 border-b border-border/60 bg-gradient-to-r from-amber-500/10 to-transparent px-5 py-4">
        <h3 class="font-display text-lg font-semibold leading-snug">{props.note.title}</h3>
        <div class="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing() ? t("common.cancel") : t("common.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash class="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-4 p-5">
        <Show
          when={editing()}
          fallback={
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {props.note.content || t("notes.noContent")}
            </p>
          }
        >
          <NoteForm
            initial={props.note}
            submitLabel={t("common.update")}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              await props.onUpdate(props.note.id, values);
              setEditing(false);
            }}
          />
        </Show>
        {error() && <p class="text-sm text-destructive">{error()}</p>}
      </div>

      <ConfirmDialog
        open={deleteOpen()}
        onOpenChange={setDeleteOpen}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.deleteNote", { title: props.note.title })}
        onConfirm={async () => {
          setError("");
          try {
            await props.onDelete(props.note.id);
          } catch (err) {
            setError(formatApiError(err));
            throw err;
          }
        }}
      />
    </article>
  );
}
