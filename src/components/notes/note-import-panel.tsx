import { Show, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { IconFileText, IconUploadCloud } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractImportedPdfText, processImportedText } from "@/lib/note-importer";
import { triggerConfetti } from "@/lib/confetti";
import { formatBytes } from "@/lib/upload-limits";
import { useT } from "@/stores/preferences-context";

export function NoteImportPanel(props: {
  onImport: (title: string, content: string) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const t = useT();
  let fileInput: HTMLInputElement | undefined;

  const [file, setFile] = createSignal<File | null>(null);
  const [processing, setProcessing] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [importedTitle, setImportedTitle] = createSignal("");
  const [importedMarkdown, setImportedMarkdown] = createSignal("");
  const [hasGarbled, setHasGarbled] = createSignal(false);

  const handleFileSelect = async (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setError("");

    const name = selectedFile.name.toLowerCase();
    const isText = name.endsWith(".txt") || name.endsWith(".md") || selectedFile.type.startsWith("text/");
    const isPdf = name.endsWith(".pdf") || selectedFile.type === "application/pdf";

    if (!isText && !isPdf) {
      setError(t("notes.previewUnsupported"));
      return;
    }

    setFile(selectedFile);
    setProcessing(true);

    try {
      let rawText = "";
      if (isPdf) {
        rawText = await extractImportedPdfText(selectedFile);
      } else {
        rawText = await selectedFile.text();
      }

      if (!rawText.trim()) throw new Error("empty import");

      const result = processImportedText(rawText, selectedFile.name);
      setImportedTitle(result.title);
      setImportedMarkdown(result.markdown);
      setHasGarbled(result.hasGarbledWarning);
    } catch {
      setFile(null);
      setImportedTitle("");
      setImportedMarkdown("");
      setHasGarbled(false);
      setError(t("notes.importReadError"));
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = async () => {
    const title = importedTitle().trim() || "Imported Note";
    const content = importedMarkdown();
    setError("");
    setSubmitting(true);

    try {
      await props.onImport(title, content);
      triggerConfetti();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="space-y-5">
      <Show when={!file()}>
        <div
          role="button"
          tabindex="0"
          aria-busy={processing()}
          class="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-muted/30 p-6 text-center outline-hidden transition-colors hover:border-primary/70 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => fileInput?.click()}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInput?.click();
            }
          }}
        >
          <input
            ref={(el) => {
              fileInput = el;
            }}
            type="file"
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            class="hidden"
            onChange={(e) => void handleFileSelect(e.currentTarget.files?.[0])}
          />
          <span class="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary-text shadow-xs">
            <IconUploadCloud class="h-6 w-6" />
          </span>
          <div class="space-y-1 max-w-sm mx-auto">
            <p class="text-sm font-semibold text-foreground">
              {t("notes.import")} (PDF, TXT, Markdown)
            </p>
            <p class="text-xs leading-normal text-muted-foreground" aria-live="polite">
              {processing() ? t("notes.importReading") : t("notes.importHelp")}
            </p>
          </div>
        </div>
      </Show>

      <Show when={file()}>
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-2 rounded-xl border border-border-line bg-card px-4 py-3 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <IconFileText class="h-4 w-4 shrink-0 text-foreground" />
              <span class="truncate font-medium text-foreground">{file()?.name}</span>
              <span class="text-muted-foreground shrink-0">({formatBytes(file()?.size ?? 0)})</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 shrink-0 rounded-full px-3 text-xs touch:h-10"
              onClick={() => {
                setFile(null);
                setError("");
                setImportedTitle("");
                setImportedMarkdown("");
                setHasGarbled(false);
              }}
            >
              {t("notes.importChangeFile")}
            </Button>
          </div>

          <Show when={hasGarbled()}>
            <p class="rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs font-medium text-warning-text">
              {t("notes.importGarbled")}
            </p>
          </Show>

          <div class="space-y-1.5 rounded-xl border border-border-line bg-card p-4 shadow-xs">
            <Label for="import-title">{t("form.title")}</Label>
            <Input
              id="import-title"
              class="h-10 rounded-lg bg-background/80"
              value={importedTitle()}
              maxlength={200}
              onInput={(e) => setImportedTitle(e.currentTarget.value)}
            />
          </div>

          <div class="space-y-1.5 rounded-xl border border-border-line bg-card p-4 shadow-xs">
            <Label for="import-content">{t("form.content")} (Markdown)</Label>
            <Textarea
              id="import-content"
              class="min-h-56 rounded-lg font-mono text-xs bg-background/80 leading-relaxed"
              value={importedMarkdown()}
              rows={10}
              onInput={(e) => setImportedMarkdown(e.currentTarget.value)}
            />
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border/80 pt-4">
            <Show when={props.onCancel}>
              <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={props.onCancel}>
                {t("common.cancel")}
              </Button>
            </Show>
            <Button
              type="button"
              class="h-10 rounded-lg px-5 font-semibold"
              disabled={processing() || submitting() || !importedMarkdown().trim()}
              onClick={() => void handleApply()}
            >
              {t("common.create")}
            </Button>
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive-text">
          {error()}
        </p>
      </Show>
    </div>
  );
}
