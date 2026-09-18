import { Link, useBlocker, useNavigate } from "@tanstack/solid-router";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { formatApiError, type Note } from "@/api/client";
import { deleteNoteById, patchNoteById, postNote } from "@/api/notes";
import { NoteFilesPanel } from "@/components/notes/note-files-panel";
import { NoteRichEditor } from "@/components/notes/note-rich-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAlert, IconChevronLeft, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { personalNoteFiles } from "@/lib/note-source";
import { useT } from "@/stores/preferences-context";

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

/**
 * A personal note as a full-page document: title, editor, attachments. A new
 * note (no `note`) becomes a real one on first save and moves to its own URL,
 * where attachments open up. Leaving with unsaved edits asks first.
 */
export function NoteDocument(props: { note?: Note }) {
  const t = useT();
  const navigate = useNavigate();
  const [title, setTitle] = createSignal(props.note?.title ?? "");
  const [content, setContent] = createSignal(props.note?.content ?? "");
  const [baseline, setBaseline] = createSignal(JSON.stringify([props.note?.title ?? "", props.note?.content ?? ""]));
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const dirty = () => JSON.stringify([title(), content()]) !== baseline();
  const isNew = () => !props.note;

  let leaving = false;
  const blocker = useBlocker({ shouldBlockFn: () => dirty(), enableBeforeUnload: () => dirty(), withResolver: true });

  const save = async () => {
    if (saving()) return;
    const trimmed = title().trim();
    if (!trimmed) return setError(t("form.titleRequired"));
    if (trimmed.length > MAX_TITLE) return setError(t("form.titleMax"));
    if (content().length > MAX_CONTENT) return setError(t("form.contentMax"));
    setError("");
    setSaving(true);
    // What is being saved, captured now: typing that lands while the request
    // is out must still count as unsaved afterwards.
    const body = content();
    try {
      if (props.note) {
        await patchNoteById(props.note.id, { title: trimmed, content: body });
        if (title().trim() === trimmed) setTitle(trimmed);
        setBaseline(JSON.stringify([trimmed, body]));
      } else {
        const created = await postNote({ title: trimmed, content: body || undefined });
        // Settle the baseline first so the move to the note's URL is not blocked.
        setBaseline(JSON.stringify([title(), content()]));
        await navigate({ to: "/notes/$id", params: { id: created.id }, replace: true });
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void save();
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  const status = () => (saving() ? t("notes.saving") : dirty() ? t("notes.unsaved") : isNew() ? "" : t("notes.allSaved"));

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <Link to="/notes" class="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <IconChevronLeft class="h-4 w-4" />
          {t("notes.backToNotebook")}
        </Link>
        <span class={cn("ml-auto text-xs", dirty() ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} aria-live="polite">
          {status()}
        </span>
        <Show when={props.note}>
          <Button type="button" variant="outline" size="sm" class="rounded-lg text-destructive-text hover:text-destructive-text" onClick={() => setDeleteOpen(true)}>
            <IconTrash class="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </Show>
      </div>

      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      {/* Title above both columns, so the editor and the attachments start on one line. */}
      <input
        class="w-full bg-transparent px-1 text-3xl font-semibold tracking-tight text-text-strong outline-hidden placeholder:text-muted-foreground/50"
        placeholder={t("notes.titlePlaceholder")}
        aria-label={t("form.title")}
        value={title()}
        maxlength={MAX_TITLE}
        onInput={(event) => setTitle(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="min-w-0">
          <NoteRichEditor
            value={content()}
            onChange={setContent}
            placeholder={t("notes.bodyPlaceholder")}
            toolbarClass="top-[45px]"
            actions={
              <>
                <Button type="button" size="sm" class="min-w-[6.5rem] rounded-lg" disabled={saving() || (!dirty() && !isNew())} onClick={() => void save()}>
                  {saving() ? t("notes.saving") : t("common.save")}
                </Button>
              </>
            }
          />
        </div>

        <aside class="min-w-0 space-y-4 xl:sticky xl:top-[61px] xl:self-start">
          <Show
            when={props.note}
            fallback={
              <section class="rounded-xl border border-dashed border-border bg-card/60 p-4">
                <h3 class="text-sm font-semibold">{t("notes.files")}</h3>
                <p class="mt-1 text-sm text-muted-foreground">{t("notes.filesAfterSave")}</p>
              </section>
            }
          >
            {(note) => <NoteFilesPanel noteId={note().id} source={personalNoteFiles} active />}
          </Show>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen()}
        onOpenChange={setDeleteOpen}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.deleteNote", { title: props.note?.title ?? "" })}
        onConfirm={async () => {
          if (!props.note) return;
          await deleteNoteById(props.note.id);
          setBaseline(JSON.stringify([title(), content()]));
          await navigate({ to: "/notes" });
        }}
      />

      <ConfirmDialog
        open={blocker().status === "blocked"}
        onOpenChange={(open) => {
          // The dialog also closes itself after "Leave"; only a dismissal resets.
          if (!open && !leaving && blocker().status === "blocked") blocker().reset?.();
        }}
        title={t("notes.leaveTitle")}
        description={t("notes.leaveHint")}
        summary={title().trim() || t("notes.titlePlaceholder")}
        variant="destructive"
        icon={<IconAlert class="h-4 w-4" />}
        confirmLabel={t("notes.leaveConfirm")}
        onConfirm={() => {
          leaving = true;
          blocker().proceed?.();
        }}
      />
    </div>
  );
}
