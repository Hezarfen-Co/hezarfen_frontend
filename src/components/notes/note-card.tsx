import { createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Note } from "@/api/types";
import { NoteForm } from "@/components/notes/note-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
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
    <article class="data-shell flex h-full min-h-40 flex-col overflow-hidden transition-colors hover:border-primary/35">
      <div class="flex items-start justify-between gap-3 border-b border-border bg-muted/25 px-3 py-3">
        <h3 class="line-clamp-2 min-w-0 font-display text-base font-semibold leading-snug">{props.note.title}</h3>
        <div class="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" class="h-7 rounded-sm px-2" onClick={() => setEditing(true)}>
            {t("common.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 rounded-sm px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash class="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-4 p-3">
        <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {props.note.content || t("notes.noContent")}
        </p>
        {error() && <p class="text-sm text-destructive">{error()}</p>}
      </div>

      <FormDialog
        open={editing()}
        onOpenChange={setEditing}
        title={t("common.edit")}
        description={props.note.title}
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
      </FormDialog>

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
