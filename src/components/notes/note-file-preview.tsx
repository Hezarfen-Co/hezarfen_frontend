import { Match, Show, Switch, createEffect, createSignal, onCleanup } from "solid-js";
import { formatApiError } from "@/api/client";
import type { NoteFile } from "@/api/client";
import type { NoteFileSource } from "@/lib/note-source";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/stores/preferences-context";

function canFrame(type: string): boolean {
  return type === "application/pdf" || type.startsWith("text/");
}

function canPreview(file: NoteFile): boolean {
  const type = file.content_type;
  return type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/") || canFrame(type);
}

export function NoteFilePreview(props: { noteId: string; source: NoteFileSource; file: NoteFile | null; onClose: () => void }) {
  const t = useT();
  let currentUrl = "";
  const [previewUrl, setPreviewUrl] = createSignal("");
  const [previewError, setPreviewError] = createSignal("");
  const downloadUrl = () => (props.file ? props.source.fileUrl(props.noteId, props.file.id) : "");
  const type = () => props.file?.content_type ?? "";

  createEffect(() => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = "";
    setPreviewUrl("");
    setPreviewError("");

    const file = props.file;
    if (!file || !canPreview(file)) return;

    const controller = new AbortController();
    void props.source.fileBlob(props.noteId, file.id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        currentUrl = URL.createObjectURL(blob);
        setPreviewUrl(currentUrl);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setPreviewError(formatApiError(err));
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
    <Dialog open={props.file != null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent class="h-[min(86vh,54rem)] max-w-[min(72rem,calc(100vw-1.5rem))] rounded-xl bg-background p-0">
        <Show when={props.file}>
          {(file) => (
            <>
              <div class="shrink-0 border-b border-border/80 px-4 py-3 pr-36">
                <div class="min-w-0">
                  <DialogTitle class="truncate text-base">{file().name}</DialogTitle>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">{type() || t("notes.unknownFileType")}</p>
                </div>
                <a class="absolute right-14 top-3 z-10 inline-flex h-8 items-center justify-center rounded-md border border-input bg-background/80 px-3 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground" href={downloadUrl()} download={file().name}>
                  {t("notes.downloadFile")}
                </a>
              </div>

              <div class="min-h-0 flex-1 bg-neutral-950 p-3 sm:p-5">
                <div class="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-900/70">
                  <Show
                    when={canPreview(file())}
                    fallback={<p class="mx-auto max-w-md rounded-md border border-dashed border-white/20 bg-white/5 px-4 py-8 text-center text-sm text-white/70">{t("notes.previewUnsupported")}</p>}
                  >
                    <Show when={!previewError()} fallback={<p class="mx-auto max-w-md rounded-md border border-dashed border-white/20 bg-white/5 px-4 py-8 text-center text-sm text-white/70">{previewError()}</p>}>
                      <Switch fallback={<p class="text-sm text-white/60">{t("common.loading")}</p>}>
                        <Match when={type().startsWith("image/") && previewUrl()}>
                          <img src={previewUrl()} alt={file().name} class="max-h-full max-w-full object-contain" />
                        </Match>
                        <Match when={type().startsWith("video/") && previewUrl()}>
                          <video src={previewUrl()} controls class="max-h-full max-w-full" />
                        </Match>
                        <Match when={type().startsWith("audio/") && previewUrl()}>
                          <div class="w-full max-w-2xl rounded-lg bg-background p-4 shadow-xs">
                            <audio src={previewUrl()} controls class="w-full" />
                          </div>
                        </Match>
                        <Match when={canFrame(type()) && previewUrl()}>
                          <iframe title={file().name} src={previewUrl()} class="h-full w-full rounded-md border border-white/10 bg-background" />
                        </Match>
                      </Switch>
                    </Show>
                  </Show>
                </div>
              </div>
            </>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  );
}
