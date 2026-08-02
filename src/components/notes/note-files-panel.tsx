import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, lazy, type JSX } from "solid-js";
import { deleteNoteFileById } from "@/api/notes";
import { getNoteFileBlob } from "@/api/notes";
import { getNoteFileUrl } from "@/api/notes";
import { getNoteFiles } from "@/api/notes";
import { getSettings } from "@/api/settings";
import { postNoteFile } from "@/api/notes";
import { formatApiError } from "@/api/client";
import type { NoteFile } from "@/api/client";
import type { DrawScene } from "@/lib/draw-stroke";
import { NoteFilePreview } from "@/components/notes/note-file-preview";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { createFlash } from "@/lib/flash";
import {
  IconDownload,
  IconEdit,
  IconEye,
  IconFileAudio,
  IconFileImage,
  IconFileSpreadsheet,
  IconFileText,
  IconFileVideo,
  IconNote,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";
import { useT } from "@/stores/preferences-context";

// Lazy so the drawing pad rides its own chunk, off the notes page's initial load.
const DrawCanvas = lazy(() => import("@/components/ui/draw-canvas").then((m) => ({ default: m.DrawCanvas })));

const MAX_NOTE_FILES = 10;
const FILE_PAGE_SIZE = 4;

/** Drawings are saved with this suffix so the grid can offer "Edit" without fetching every blob. */
const DRAWING_SUFFIX = ".hzdraw.png";
const isDrawing = (file: NoteFile) => file.name.toLowerCase().endsWith(DRAWING_SUFFIX);

function extension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext !== name.toLowerCase() ? ext : "file";
}

function fileMeta(file: NoteFile): { label: string; class: string; icon: JSX.Element } {
  const type = file.content_type.toLowerCase();
  const ext = extension(file.name);
  if (type.startsWith("image/")) return { label: ext, class: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: <IconFileImage class="h-8 w-8" /> };
  if (type.startsWith("video/")) return { label: ext, class: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300", icon: <IconFileVideo class="h-8 w-8" /> };
  if (type.startsWith("audio/")) return { label: ext, class: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", icon: <IconFileAudio class="h-8 w-8" /> };
  if (type === "application/pdf" || ext === "pdf") return { label: "pdf", class: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: <IconFileText class="h-8 w-8" /> };
  if (["xls", "xlsx", "csv"].includes(ext) || type.includes("spreadsheet")) return { label: ext, class: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: <IconFileSpreadsheet class="h-8 w-8" /> };
  if (["doc", "docx", "txt", "md", "rtf"].includes(ext) || type.startsWith("text/") || type.includes("word")) return { label: ext, class: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300", icon: <IconFileText class="h-8 w-8" /> };
  return { label: ext, class: "border-border bg-background text-muted-foreground", icon: <IconNote class="h-8 w-8" /> };
}

export function NoteFilesPanel(props: { noteId: string; active: boolean }) {
  let input: HTMLInputElement | undefined;
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const [filePage, setFilePage] = createSignal(0);
  const [drawOpen, setDrawOpen] = createSignal(false);
  const [editScene, setEditScene] = createSignal<DrawScene | null>(null);
  const [editTarget, setEditTarget] = createSignal<NoteFile | null>(null);
  const [previewFile, setPreviewFile] = createSignal<NoteFile | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<NoteFile | null>(null);
  const [files, { refetch }] = createResource(
    () => (props.active ? props.noteId : null),
    async (noteId) => {
      if (!noteId) return [] as NoteFile[];
      return (await getNoteFiles(noteId, { limit: MAX_NOTE_FILES })).items;
    },
  );
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => maxUploadBytes(settings());
  const atLimit = () => (files() ?? []).length >= MAX_NOTE_FILES;
  const totalPages = createMemo(() => Math.max(1, Math.ceil((files() ?? []).length / FILE_PAGE_SIZE)));
  const pageFiles = createMemo(() => {
    const start = filePage() * FILE_PAGE_SIZE;
    return (files() ?? []).slice(start, start + FILE_PAGE_SIZE);
  });

  createEffect(() => {
    if (filePage() >= totalPages()) setFilePage(totalPages() - 1);
  });

  const upload = async (file: File | undefined): Promise<boolean> => {
    if (!file) return false;
    setError("");
    if (file.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return false;
    }
    setPending(true);
    try {
      await postNoteFile(props.noteId, file);
      await refetch();
      if (input) input.value = "";
      setFlash(t("common.created"));
      return true;
    } catch (err) {
      setError(formatApiError(err));
      return false;
    } finally {
      setPending(false);
    }
  };

  const download = (file: NoteFile) => {
    const link = document.createElement("a");
    link.href = getNoteFileUrl(props.noteId, file.id);
    link.download = file.name;
    link.click();
  };

  const openNewDrawing = () => {
    setEditScene(null);
    setEditTarget(null);
    setDrawOpen(true);
  };

  const openEditDrawing = async (file: NoteFile) => {
    setError("");
    try {
      const blob = await getNoteFileBlob(props.noteId, file.id);
      const { pngBytesToScene } = await import("@/lib/drawing-file");
      setEditScene(pngBytesToScene(new Uint8Array(await blob.arrayBuffer())));
      setEditTarget(file);
      setDrawOpen(true);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  // Create-new-then-delete-old: the replacement must be safely stored before the
  // original is removed, so a failed upload never loses the existing drawing.
  const saveDrawing = async (file: File) => {
    const target = editTarget();
    if (!(await upload(file))) return;
    if (target) {
      try {
        await deleteNoteFileById(props.noteId, target.id);
        await refetch();
      } catch {
        // New drawing is saved; deleting the old copy failed — a stale duplicate
        // remains, but nothing is lost. Leave it rather than risk the new one.
      }
    }
    setEditScene(null);
    setEditTarget(null);
    setDrawOpen(false);
  };

  return (
    <section class="space-y-3 rounded-lg border border-border/80 bg-card p-4 shadow-xs dark:border-white/8">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold">{t("notes.files")}</h3>
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
        <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button type="button" variant="outline" size="sm" class="w-full sm:w-32 rounded-lg" disabled={pending() || atLimit()} onClick={openNewDrawing}>
            <IconEdit class="h-4 w-4 shrink-0" />
            <span class="truncate">{t("notes.draw")}</span>
          </Button>
          <Button type="button" size="sm" class="w-full sm:w-32 rounded-lg" disabled={pending() || atLimit()} onClick={() => input?.click()}>
            <IconPlus class="h-4 w-4 shrink-0" />
            <span class="truncate">{t("notes.addFile")}</span>
          </Button>
        </div>
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
          <ul class="grid grid-cols-1 gap-3 rounded-md border border-border/70 bg-background/70 p-2 sm:grid-cols-2">
            <For each={pageFiles()}>
              {(file) => {
                const meta = fileMeta(file);
                return (
                  <li class="group overflow-hidden rounded-xl border border-border/70 bg-card text-sm shadow-xs transition-colors hover:border-amber-500/40">
                    <div class="relative h-28 bg-muted/25">
                      <button type="button" class="flex h-full w-full items-center justify-center rounded-t-xl transition-colors hover:bg-muted/40" aria-label={`${t("common.view")}: ${file.name}`} onClick={() => setPreviewFile(file)}>
                        <span class={cn("flex h-16 w-16 items-center justify-center rounded-lg border", meta.class)}>
                          {meta.icon}
                        </span>
                      </button>
                      <span class={cn("absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", meta.class)}>
                        {meta.label}
                      </span>
                      <div class="absolute right-2 top-2 z-10 rounded-xl border border-border/80 bg-card/90 shadow-md dark:border-white/15 dark:bg-card/95">
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[
                            ...(isDrawing(file)
                              ? [
                                  {
                                    label: t("common.edit"),
                                    icon: <IconEdit class="h-4 w-4" />,
                                    onSelect: () => void openEditDrawing(file),
                                  },
                                ]
                              : []),
                            {
                              label: t("common.view"),
                              icon: <IconEye class="h-4 w-4" />,
                              onSelect: () => setPreviewFile(file),
                            },
                            {
                              label: t("notes.downloadFile"),
                              icon: <IconDownload class="h-4 w-4" />,
                              onSelect: () => download(file),
                            },
                            {
                              label: t("common.delete"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setDeleteTarget(file),
                            },
                          ]}
                        />
                      </div>
                    </div>
                    <button type="button" class="w-full px-3 py-2 text-left hover:bg-muted/30" onClick={() => setPreviewFile(file)}>
                      <span class="block truncate font-medium">{file.name}</span>
                      <span class="mt-1 block text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
          <Show when={(files() ?? []).length > FILE_PAGE_SIZE}>
            <PaginationControls page={filePage()} totalPages={totalPages()} onPageChange={setFilePage} />
          </Show>
          <NoteFilePreview noteId={props.noteId} file={previewFile()} onClose={() => setPreviewFile(null)} />
        </Show>
      </Suspense>

      <FormDialog
        open={drawOpen()}
        onOpenChange={(open) => {
          setDrawOpen(open);
          if (!open) {
            setEditScene(null);
            setEditTarget(null);
          }
        }}
        title={t("notes.drawTitle")}
        class="sm:max-w-3xl"
      >
        <Show when={error()}>
          <p class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
        </Show>
        <Suspense fallback={<PageSpinner />}>
          <DrawCanvas
            pending={pending()}
            initialScene={editScene()}
            fileName={editTarget()?.name ?? `drawing-${(files() ?? []).length + 1}${DRAWING_SUFFIX}`}
            onSave={(file) => void saveDrawing(file)}
          />
        </Suspense>
      </FormDialog>

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
          if (previewFile()?.id === target.id) setPreviewFile(null);
          setDeleteTarget(null);
          await refetch();
          setFlash(t("common.deleted"));
        }}
      />
    </section>
  );
}
