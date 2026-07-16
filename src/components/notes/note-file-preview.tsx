import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { getNoteFileBlob } from "@/api/getNoteFileBlob";
import type { NoteFile } from "@/api/types";
import { getNoteFileUrl } from "@/api/getNoteFileUrl";
import { Button } from "@/components/ui/button";
import { useT } from "@/stores/preferences-context";

function canFrame(type: string): boolean {
  return type === "application/pdf" || type.startsWith("text/");
}

function canPreview(file: NoteFile): boolean {
  const type = file.content_type;
  return type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/") || canFrame(type);
}

export function NoteFilePreview(props: { noteId: string; file: NoteFile | null; onClose: () => void }) {
  const t = useT();
  let currentUrl = "";
  const [previewUrl, setPreviewUrl] = createSignal("");
  const downloadUrl = () => (props.file ? getNoteFileUrl(props.noteId, props.file.id) : "");
  const type = () => props.file?.content_type ?? "";

  createEffect(() => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = "";
    setPreviewUrl("");

    const file = props.file;
    if (!file || !canPreview(file)) return;

    const controller = new AbortController();
    void getNoteFileBlob(props.noteId, file.id, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      currentUrl = URL.createObjectURL(blob);
      setPreviewUrl(currentUrl);
    });

    onCleanup(() => {
      controller.abort();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = "";
    });
  });

  onCleanup(() => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
  });

  return (
    <Show when={props.file}>
      {(file) => (
        <div class="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <h4 class="truncate text-sm font-semibold">{file().name}</h4>
              <p class="mt-0.5 text-xs text-muted-foreground">{type() || t("notes.unknownFileType")}</p>
            </div>
            <Button type="button" size="sm" variant="ghost" class="rounded-md" onClick={props.onClose}>
              {t("nav.close")}
            </Button>
          </div>

          <Show
            when={canPreview(file())}
            fallback={<p class="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">{t("notes.previewUnsupported")}</p>}
          >
            <Show when={type().startsWith("image/") && previewUrl()}>
              <img src={previewUrl()} alt={file().name} class="max-h-[28rem] w-full rounded-md border border-border/60 bg-muted/20 object-contain" />
            </Show>
            <Show when={type().startsWith("video/") && previewUrl()}>
              <video src={previewUrl()} controls class="max-h-[28rem] w-full rounded-md border border-border/60 bg-black" />
            </Show>
            <Show when={type().startsWith("audio/") && previewUrl()}>
              <audio src={previewUrl()} controls class="w-full" />
            </Show>
            <Show when={canFrame(type()) && previewUrl()}>
              <iframe title={file().name} src={previewUrl()} class="h-[28rem] w-full rounded-md border border-border/60 bg-background" />
            </Show>
          </Show>
          <a class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background/80 px-3 text-xs font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground" href={downloadUrl()} download={file().name}>
            {t("notes.downloadFile")}
          </a>
        </div>
      )}
    </Show>
  );
}
