import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { deleteNoteFileById } from "@/api/deleteNoteFileById";
import { getNoteFileUrl } from "@/api/getNoteFileUrl";
import { getNoteFiles } from "@/api/getNoteFiles";
import { getSettings } from "@/api/getSettings";
import { postNoteFile } from "@/api/postNoteFile";
import { ApiError, formatApiError } from "@/api/client";
import type { NoteFile } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

const MAX_NOTE_FILES = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NoteFilesPanel(props: { noteId: string; active: boolean }) {
  let input: HTMLInputElement | undefined;
  const t = useT();
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<NoteFile | null>(null);
  const [files, { refetch }] = createResource(
    () => (props.active ? props.noteId : null),
    async (noteId) => {
      if (!noteId) return [] as NoteFile[];
      // ponytail: empty on 404 so missing BE file API doesn't kill the reader dialog
      try {
        return (await getNoteFiles(noteId, { limit: MAX_NOTE_FILES })).items;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 501)) return [];
        throw err;
      }
    },
  );
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => settings()?.max_file_bytes ?? 5 * 1024 * 1024;
  const atLimit = () => (files() ?? []).length >= MAX_NOTE_FILES;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (file.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return;
    }
    setPending(true);
    try {
      await postNoteFile(props.noteId, file);
      await refetch();
      if (input) input.value = "";
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section class="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-display text-sm font-semibold">{t("notes.files")}</h3>
          <p class="mt-1 text-xs text-muted-foreground">{t("notes.filesHelp", { size: formatBytes(maxFileBytes()) })}</p>
        </div>
        <input
          ref={(el) => {
            input = el;
          }}
          type="file"
          class="hidden"
          disabled={pending() || atLimit()}
          onChange={(event) => void upload(event.currentTarget.files?.[0])}
        />
        <Button type="button" size="sm" class="rounded-md" disabled={pending() || atLimit()} onClick={() => input?.click()}>
          <IconPlus class="h-4 w-4" />
          {t("notes.addFile")}
        </Button>
      </div>

      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}
      <Show when={atLimit()}>
        <p class="text-xs text-muted-foreground">{t("notes.fileLimit")}</p>
      </Show>

      <Show when={files.error}>
        <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formatApiError(files.error)}</p>
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show
          when={(files() ?? []).length > 0}
          fallback={<p class="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">{t("notes.noFiles")}</p>}
        >
          <ul class="divide-y divide-border/70 rounded-md border border-border/70 bg-background/70">
            <For each={files() ?? []}>
              {(file) => (
                <li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <a class="min-w-0 flex-1 truncate font-medium hover:text-primary" href={getNoteFileUrl(props.noteId, file.id)} download={file.name}>
                    {file.name}
                  </a>
                  <span class="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8 rounded-md text-destructive hover:text-destructive" onClick={() => setDeleteTarget(file)}>
                    <IconTrash class="h-4 w-4" />
                  </Button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.deleteNoteFile", { title: deleteTarget()?.name ?? "" })}
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          await deleteNoteFileById(props.noteId, target.id);
          setDeleteTarget(null);
          await refetch();
        }}
      />
    </section>
  );
}
