import { createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Note } from "@/api/client";
import { NoteForm } from "@/components/notes/note-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { useT } from "@/stores/preferences-context";

export function NoteCard(props: {
  note: Note;
  onOpen: (note: Note) => void;
  onUpdate: (id: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [deleteOpen, setDeleteOpen] = createSignal(false);

  return (
    <>
      <article
        role="button"
        tabindex="0"
        class="group flex h-full min-h-72 cursor-pointer flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-card shadow-xs card-lift hover:border-amber-400/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-500/30 dark:hover:border-amber-400/60"
        onClick={() => props.onOpen(props.note)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onOpen(props.note);
          }
        }}
      >
        <div class="flex items-start justify-between gap-3 border-b border-amber-500/30 bg-muted/40 px-4 py-3 dark:border-amber-500/30 dark:bg-muted/30">
          <h3 class="line-clamp-2 min-w-0 font-display text-base font-semibold leading-snug">{props.note.title}</h3>
          <div class="shrink-0" onClick={(event) => event.stopPropagation()}>
            <TableRowActions
              label={t("common.actions")}
              actions={[
                {
                  label: t("common.edit"),
                  icon: <IconEdit class="h-4 w-4" />,
                  onSelect: () => setEditing(true),
                },
                {
                  label: t("common.delete"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setDeleteOpen(true),
                },
              ]}
            />
          </div>
        </div>
        <div class="flex flex-1 flex-col gap-4 bg-[linear-gradient(90deg,rgba(245,158,11,0.12)_0,rgba(245,158,11,0.12)_2.25rem,transparent_2.25rem),repeating-linear-gradient(0deg,transparent_0,transparent_2.05rem,rgba(120,113,108,0.14)_2.1rem)] px-4 py-4 pl-12 dark:bg-[linear-gradient(90deg,rgba(245,158,11,0.1)_0,rgba(245,158,11,0.1)_2.25rem,transparent_2.25rem),repeating-linear-gradient(0deg,transparent_0,transparent_2.05rem,rgba(214,211,209,0.1)_2.1rem)]">
          <p class="line-clamp-6 whitespace-pre-wrap text-[13px] leading-8 text-muted-foreground group-hover:text-foreground">
            {props.note.content || t("notes.noContent")}
          </p>
          {error() && <p class="text-sm text-destructive">{error()}</p>}
        </div>
      </article>

      <SidePanel open={editing()} onOpenChange={setEditing} title={t("common.edit")} description={props.note.title}>
        <NoteForm
          initial={props.note}
          submitLabel={t("common.update")}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await props.onUpdate(props.note.id, values);
            setEditing(false);
          }}
        />
      </SidePanel>

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
    </>
  );
}
