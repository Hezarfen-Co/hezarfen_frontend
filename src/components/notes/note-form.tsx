import { For, Show, createResource, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { getSettings } from "@/api/getSettings";
import type { Note } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

export type NoteFormValues = {
  title: string;
  content: string;
  files: File[];
};

const MAX_NOTE_FILES = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NoteForm(props: {
  initial?: Partial<Note>;
  submitLabel?: string;
  /** Stage files on create (uploaded by parent after note exists). */
  enableFiles?: boolean;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  let fileInput: HTMLInputElement | undefined;
  const isUpdate = () => !!props.initial?.id;
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [content, setContent] = createSignal(props.initial?.content ?? "");
  const [files, setFiles] = createSignal<File[]>([]);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<NoteFormValues | null>(null);
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => settings()?.max_file_bytes ?? 5 * 1024 * 1024;
  const showFiles = () => !!props.enableFiles && !isUpdate();

  const validate = (): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (content().length > 10_000) return t("form.contentMax");
    return null;
  };

  const addFile = (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (file.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return;
    }
    if (files().length >= MAX_NOTE_FILES) {
      setError(t("notes.fileLimit"));
      return;
    }
    setFiles((prev) => [...prev, file]);
    if (fileInput) fileInput.value = "";
  };

  const save = async (values: NoteFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isUpdate()) {
        setTitle("");
        setContent("");
        setFiles([]);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const values: NoteFormValues = { title: title().trim(), content: content(), files: files() };
    if (isUpdate()) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    await save(values);
  };

  return (
    <>
      <form class="space-y-5" onSubmit={handleSubmit}>
        <div class="space-y-1.5 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <Label for="note-title">{t("form.title")}</Label>
          <Input
            id="note-title"
            class="h-10 rounded-lg bg-background/80"
            value={title()}
            maxlength={200}
            required
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </div>
        <div class="space-y-1.5 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <Label for="note-content">{t("form.content")}</Label>
          <Textarea
            id="note-content"
            class="min-h-32 rounded-lg bg-background/80"
            value={content()}
            maxlength={10000}
            rows={4}
            onInput={(e) => setContent(e.currentTarget.value)}
          />
        </div>

        <Show when={showFiles()}>
          <section class="space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold">{t("notes.files")}</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  {t("notes.filesHelp", { size: formatBytes(maxFileBytes()) })}
                </p>
              </div>
              <input
                ref={(el) => {
                  fileInput = el;
                }}
                type="file"
                class="hidden"
                disabled={pending() || files().length >= MAX_NOTE_FILES}
                onChange={(event) => addFile(event.currentTarget.files?.[0])}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="rounded-md"
                disabled={pending() || files().length >= MAX_NOTE_FILES}
                onClick={() => fileInput?.click()}
              >
                <IconPlus class="h-4 w-4" />
                {t("notes.addFile")}
              </Button>
            </div>
            <Show
              when={files().length > 0}
              fallback={
                <p class="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
                  {t("notes.noFiles")}
                </p>
              }
            >
              <ul class="divide-y divide-border/70 rounded-md border border-border/70">
                <For each={files()}>
                  {(file, index) => (
                    <li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span class="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                      <span class="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 rounded-md text-destructive hover:text-destructive"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index()))}
                      >
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>
        </Show>

        {error() && (
          <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error()}
          </p>
        )}
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border/80 pt-4">
          {props.onCancel && (
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={props.onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
            {props.submitLabel ?? t("common.save")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title={t("confirm.updateTitle")}
        summary={t("confirm.updateNote", { title: pendingValues()?.title ?? "" })}
        onConfirm={async () => {
          const values = pendingValues();
          if (!values) return;
          await save(values);
        }}
      />
    </>
  );
}
