import { Link, useBlocker, useNavigate } from "@tanstack/solid-router";
import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { getSettings } from "@/api/settings";
import { formatApiError, type Note } from "@/api/client";
import { deleteNoteById, patchNoteById, postNote, postNoteFile } from "@/api/notes";
import { NoteFilesPanel } from "@/components/notes/note-files-panel";
import { NoteRichEditor } from "@/components/notes/note-rich-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAlert, IconChevronLeft, IconPlus, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createResource } from "@/lib/create-resource";
import { personalNoteFiles } from "@/lib/note-source";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";
import { showToast } from "@/components/ui/toast";
import { useT } from "@/stores/preferences-context";

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

export function stageFiles(current: File[], selected: File[], maxFiles: number, maxBytes: number) {
  const files = [...current];
  let tooLarge = false;
  let atLimit = false;
  for (const file of selected) {
    if (file.size > maxBytes) {
      tooLarge = true;
      continue;
    }
    if (files.length >= maxFiles) {
      atLimit = true;
      continue;
    }
    files.push(file);
  }
  return { files, tooLarge, atLimit };
}

export async function uploadStagedFiles(noteId: string, files: File[], uploadFile = postNoteFile) {
  const failed: string[] = [];
  for (const file of files) {
    try {
      await uploadFile(noteId, file);
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}

const fileSnapshot = (files: File[]) => files.map((file) => [file.name, file.size, file.lastModified]);
const documentSnapshot = (title: string, content: string, files: File[]) => JSON.stringify([title, content, fileSnapshot(files)]);

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
  const [stagedFiles, setStagedFiles] = createSignal<File[]>([]);
  const [baseline, setBaseline] = createSignal(documentSnapshot(props.note?.title ?? "", props.note?.content ?? "", []));
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => maxUploadBytes(settings());
  const atFileLimit = () => stagedFiles().length >= personalNoteFiles.maxFiles;
  const dirty = () => documentSnapshot(title(), content(), stagedFiles()) !== baseline();
  const isNew = () => !props.note;
  let fileInput: HTMLInputElement | undefined;

  let leaving = false;
  const blocker = useBlocker({ shouldBlockFn: () => dirty(), enableBeforeUnload: () => dirty(), withResolver: true });

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const result = stageFiles(stagedFiles(), Array.from(selected), personalNoteFiles.maxFiles, maxFileBytes());
    setStagedFiles(result.files);
    if (result.tooLarge) setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
    else if (result.atLimit) setError(t("notes.fileLimit"));
    else setError("");
    if (fileInput) fileInput.value = "";
  };

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
        setBaseline(documentSnapshot(trimmed, body, []));
      } else {
        const created = await postNote({ title: trimmed, content: body || undefined });
        const failedFiles = await uploadStagedFiles(created.id, stagedFiles());
        setStagedFiles([]);
        // Settle the baseline first so the move to the note's URL is not blocked.
        setBaseline(documentSnapshot(title(), content(), []));
        await navigate({ to: "/notes/$id", params: { id: created.id }, replace: true });
        if (failedFiles.length > 0) showToast({ title: t("notes.fileUploadFailed", { files: failedFiles.join(", ") }) });
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
              <section class="space-y-3 rounded-lg border border-border/80 bg-card p-4 shadow-xs dark:border-white/8">
                <div>
                  <h3 class="text-sm font-semibold">{t("notes.files")}</h3>
                  <p class="mt-1 text-xs text-muted-foreground">{t("notes.filesHelp", { size: formatBytes(maxFileBytes()) })}</p>
                </div>
                <input
                  ref={(element) => {
                    fileInput = element;
                  }}
                  type="file"
                  multiple
                  class="hidden"
                  disabled={saving() || atFileLimit()}
                  onChange={(event) => addFiles(event.currentTarget.files)}
                />
                <div class="grid w-full grid-cols-2 gap-2">
                  <Button type="button" size="sm" class="col-span-2 w-full rounded-lg" disabled={saving() || atFileLimit()} onClick={() => fileInput?.click()}>
                    <IconPlus class="h-4 w-4 shrink-0" />
                    <span class="truncate">{t("notes.addFile")}</span>
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">{t("notes.filesUploadOnSave")}</p>
                <Show when={atFileLimit()}>
                  <p class="text-xs text-muted-foreground">{t("notes.fileLimit")}</p>
                </Show>
                <Show
                  when={stagedFiles().length > 0}
                  fallback={<p class="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">{t("notes.noFiles")}</p>}
                >
                  <ul class="space-y-2 rounded-md border border-border/70 bg-background/70 p-2">
                    <For each={stagedFiles()}>
                      {(file, index) => (
                        <li class="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-card px-2.5 py-2 text-sm">
                          <span class="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                          <span class="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-destructive-text"
                            aria-label={`${t("notes.removeFile")}: ${file.name}`}
                            onClick={() => setStagedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index()))}
                          >
                            <IconTrash class="h-4 w-4" />
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
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
          setBaseline(documentSnapshot(title(), content(), []));
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
