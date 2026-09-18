import { For, Show, createSignal, onCleanup } from "solid-js";
import type { RagOutput } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { IconCopy, IconDownload, IconFileText } from "@/components/ui/icons";
import {
  buildRagOutputMarkdown,
  fieldValueText,
  ragOutputFileName,
  readRagOutputDocument,
} from "@/components/notes/rag-output-document";
import { ragOutputMessage, type RagOutputMessageKey } from "@/components/notes/rag-output-messages";
import { formatDateTime } from "@/lib/format";
import { usePreferences } from "@/stores/preferences-context";

/**
 * Print isolation: the SidePanel portals into the app's document, so a bare
 * `window.print()` would capture the whole page. These rules hide every
 * element except the document body, flatten the panel out of its fixed,
 * scroll-clipped layout, and pull the document to the page origin. The action
 * row and the technical disclosure opt out with `print:hidden`.
 */
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .rag-output-print, .rag-output-print * { overflow: visible !important; }
  .rag-output-print { position: static !important; max-width: none !important; height: auto !important; box-shadow: none !important; }
  .rag-output-print [data-rag-print-doc], .rag-output-print [data-rag-print-doc] * { visibility: visible; }
  .rag-output-print [data-rag-print-doc] { position: absolute; left: 0; top: 0; width: 100%; color: #000; }
}
`;

/** Payload keys with a Turkish label; anything else is labelled by its key. */
const FIELD_LABELS: Partial<Record<string, RagOutputMessageKey>> = {
  chunks: "chunks",
};

/**
 * One stored AI output, readable and exportable: the note it belongs to, the
 * attachments by name, the produced prose, the lesser payload fields, and the
 * raw record behind a disclosure. Copy / download / print all build their
 * output from this same document.
 */
export function RagOutputDrawer(props: {
  output: RagOutput | null;
  /** The note the output belongs to — shown by title, never by id. */
  noteTitle?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale } = usePreferences();
  const rt = (key: RagOutputMessageKey, vars?: Record<string, string | number>) =>
    ragOutputMessage(locale(), key, vars);
  const [copied, setCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal("");
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => copiedTimer && clearTimeout(copiedTimer));

  const doc = () => (props.output ? readRagOutputDocument(props.output) : null);
  const noteTitle = () => props.noteTitle?.trim() ?? "";
  const markdown = () => {
    const output = props.output;
    const read = doc();
    if (!output || !read) return "";
    return buildRagOutputMarkdown({
      title: noteTitle() || rt("drawerTitle"),
      date: formatDateTime(output.generated_at, locale()),
      noteTitle: noteTitle(),
      document: read,
      labels: {
        date: rt("date"),
        note: rt("note"),
        sources: rt("sources"),
        failed: rt("failedTitle"),
        otherFields: rt("otherFields"),
      },
    });
  };

  const copy = async () => {
    setCopyError("");
    if (!navigator.clipboard?.writeText) {
      setCopyError(rt("copyFailed"));
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown());
      setCopied(true);
      copiedTimer = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setCopyError(rt("copyFailed"));
    }
  };

  const download = () => {
    const output = props.output;
    if (!output) return;
    const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ragOutputFileName(output.generated_at);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <SidePanel
      open={props.output != null}
      onOpenChange={props.onOpenChange}
      title={rt("drawerTitle")}
      description={noteTitle()}
      size="wide"
      class="rag-output-print"
    >
      <style>{PRINT_STYLES}</style>
      <Show when={props.output}>
        {(output) => (
          <Show when={doc()}>
            {(read) => (
              <article data-rag-print-doc class="space-y-4">
                <header class="space-y-0.5 border-b border-border/60 pb-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">{rt("drawerTitle")}</p>
                  <h2 class="text-base font-semibold">{noteTitle() || rt("drawerTitle")}</h2>
                  <p class="text-xs text-muted-foreground">{formatDateTime(output().generated_at, locale())}</p>
                </header>

                <div class="flex flex-wrap items-center gap-2 print:hidden">
                  <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
                    <IconCopy class="h-4 w-4" />
                    {rt("copy")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={download}>
                    <IconDownload class="h-4 w-4" />
                    {rt("download")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
                    <IconFileText class="h-4 w-4" />
                    {rt("print")}
                  </Button>
                </div>
                <Show when={copied()}>
                  <Alert variant="success">{rt("copied")}</Alert>
                </Show>
                <Show when={copyError()}>
                  <Alert variant="destructive">{copyError()}</Alert>
                </Show>

                <dl class="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
                  <dt class="text-muted-foreground">{rt("date")}</dt>
                  <dd class="mono text-xs sm:pt-0.5">{formatDateTime(output().generated_at, locale())}</dd>
                  <Show when={noteTitle()}>
                    <dt class="text-muted-foreground">{rt("note")}</dt>
                    <dd>{noteTitle()}</dd>
                  </Show>
                </dl>

                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rt("sources")}</p>
                  <Show
                    when={read().sourceNames.length > 0 || read().unnamedSources > 0}
                    fallback={<p class="text-sm text-muted-foreground">{rt("noSources")}</p>}
                  >
                    <ul class="list-disc space-y-0.5 pl-5 text-sm">
                      <For each={read().sourceNames}>{(name) => <li>{name}</li>}</For>
                      <Show when={read().unnamedSources > 0}>
                        <li>
                          {rt("unnamedSource")}
                          {read().unnamedSources > 1 ? ` × ${read().unnamedSources}` : ""}
                        </li>
                      </Show>
                    </ul>
                  </Show>
                </div>

                <Show when={read().failed.length > 0}>
                  <Alert variant="warning">
                    {/* One flex item: Alert lays its children out in a row. */}
                    <div class="space-y-0.5">
                      <p class="font-medium">{rt("failedTitle")}</p>
                      <p>{rt("failedLine", { names: read().failed.join(", ") })}</p>
                    </div>
                  </Alert>
                </Show>

                <Show
                  when={read().summary || read().points.length > 0}
                  fallback={<Alert variant="warning">{rt("emptyText")}</Alert>}
                >
                  <Show when={read().summary}>
                    <p class="whitespace-pre-wrap text-sm leading-6">{read().summary}</p>
                  </Show>
                  <Show when={read().points.length > 0}>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-foreground/85">
                      <For each={read().points}>{(point) => <li>{point}</li>}</For>
                    </ul>
                  </Show>
                </Show>

                <Show when={read().fields.length > 0}>
                  <div class="space-y-1.5">
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {rt("otherFields")}
                    </p>
                    <dl class="space-y-1.5 text-sm">
                      <For each={read().fields}>
                        {(field) => (
                          <div class="flex flex-wrap gap-x-2">
                            <dt class="shrink-0 text-muted-foreground">
                              {FIELD_LABELS[field.key] ? rt(FIELD_LABELS[field.key]!) : field.key}
                            </dt>
                            <dd class="min-w-0 break-words whitespace-pre-wrap">{fieldValueText(field.value)}</dd>
                          </div>
                        )}
                      </For>
                    </dl>
                  </div>
                </Show>

                <details class="rounded-lg border border-border/60 p-3 print:hidden">
                  <summary class="cursor-pointer text-xs font-medium text-muted-foreground">{rt("technical")}</summary>
                  <pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5">
                    {JSON.stringify(read().raw, null, 2)}
                  </pre>
                </details>
              </article>
            )}
          </Show>
        )}
      </Show>
    </SidePanel>
  );
}
