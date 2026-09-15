import { Show, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Note } from "@/api/client";
import { NoteForm } from "@/components/notes/note-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronRight, IconEdit, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import { richTextExcerpt, toRichTextHtml } from "@/lib/rich-text";
import { useT } from "@/stores/preferences-context";

export function NoteCard(props: {
  note: Note;
  /** Hides the edit/delete menu when false. Defaults to true. */
  canManage?: boolean;
  onOpen: (note: Note) => void;
  /** Edits somewhere else (the full-page editor) instead of the side panel. */
  onEdit?: (note: Note) => void;
  onUpdate: (id: string, values: { title: string; content: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const canManage = () => props.canManage !== false;
  const excerpt = () => richTextExcerpt(toRichTextHtml(props.note.content), 320);

  return (
    <>
      <article
        role="button"
        tabindex="0"
        class="group flex h-full min-h-44 cursor-pointer flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => props.onOpen(props.note)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onOpen(props.note);
          }
        }}
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="line-clamp-2 min-w-0 text-[15px] font-semibold leading-snug text-text-strong">{props.note.title}</h3>
          <Show when={canManage()}>
            <div class="-mr-1.5 -mt-1 shrink-0" onClick={(event) => event.stopPropagation()}>
              <TableRowActions
                label={t("common.actions")}
                actions={[
                  {
                    label: t("common.edit"),
                    icon: <IconEdit class="h-4 w-4" />,
                    onSelect: () => (props.onEdit ? props.onEdit(props.note) : setEditing(true)),
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
          </Show>
        </div>
        {/* Plain-text excerpt: the card never renders stored HTML. */}
        <p class={cn("mt-2 line-clamp-5 flex-1 text-[13px] leading-6", excerpt() ? "text-muted-foreground" : "italic text-muted-foreground/70")}>
          {excerpt() || t("notes.noContent")}
        </p>
        <span class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {t("notes.open")}
          <IconChevronRight class="h-3.5 w-3.5" />
        </span>
        {error() && <p class="mt-2 text-sm text-destructive">{error()}</p>}
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
