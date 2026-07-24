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
          class="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/50 ring-1 ring-amber-500/25 bg-muted/30 p-6 text-center transition-all hover:border-amber-400 hover:ring-amber-400/40 hover:bg-muted/50"
          onClick={() => fileInput?.click()}
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
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/50 ring-1 ring-amber-500/30 bg-muted/40 text-foreground shadow-xs">
            <IconUploadCloud class="h-6 w-6" />
          </span>
          <div class="space-y-1 max-w-sm mx-auto">
            <p class="text-sm font-semibold text-foreground">
              {t("notes.import")} (PDF, TXT, Markdown)
            </p>
            <p class="text-xs leading-normal text-muted-foreground">
              {t("notes.importHelp")}
            </p>
          </div>
        </div>
      </Show>

      <Show when={file()}>
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-xl border border-amber-500/40 ring-1 ring-amber-500/25 bg-card px-4 py-3 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <IconFileText class="h-4 w-4 shrink-0 text-foreground" />
              <span class="truncate font-medium text-foreground">{file()?.name}</span>
              <span class="text-muted-foreground shrink-0">({formatBytes(file()?.size ?? 0)})</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 text-xs rounded-lg"
              onClick={() => {
                setFile(null);
                setError("");
                setImportedTitle("");
                setImportedMarkdown("");
                setHasGarbled(false);
              }}
            >
              {t("common.edit")}
            </Button>
          </div>

          <Show when={hasGarbled()}>
            <p class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              ⚠️ Some content may be unreadable due to OCR/extraction issues
            </p>
          </Show>

          <div class="space-y-1.5 rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <Label for="import-title">{t("form.title")}</Label>
            <Input
              id="import-title"
              class="h-10 rounded-lg bg-background/80"
              value={importedTitle()}
              maxlength={200}
              onInput={(e) => setImportedTitle(e.currentTarget.value)}
            />
          </div>

          <div class="space-y-1.5 rounded-xl border border-border/80 bg-card p-4 shadow-xs">
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
        <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error()}
        </p>
      </Show>
    </div>
  );
}
