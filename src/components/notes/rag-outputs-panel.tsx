import { Show, Suspense, createSignal, onCleanup } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getAiCapabilities } from "@/api/ai";
import { formatApiError } from "@/api/client";
import type { RagOutput } from "@/api/client";
import type { NoteFileSource } from "@/lib/note-source";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";
import { IconCopy, IconDownload, IconFileText, IconSparkles, IconTrash } from "@/components/ui/icons";
import { RagOutputContent } from "@/components/notes/rag-output-content";
import {
  buildRagOutputMarkdown,
  ragOutputFileName,
  readRagOutputDocument,
  type RagOutputPassage,
} from "@/components/notes/rag-output-document";
import { ragOutputMessage, ragOutputPassagePages } from "@/components/notes/rag-output-messages";

const RAG_PAGE_SIZE = 1;

/**
 * The capability a worker must have declared for a reindex call to have any
 * chance of being answered. `/ai/capabilities` lists what connected services
 * actually serve, so the button stays disabled until some worker serves this.
 */
const RAG_INDEX_CAPABILITY = "rag.index";

export function RagOutputsPanel(props: {
  noteId: string;
  active: boolean;
  source: NoteFileSource;
  /** The note's title, shown by name in the output drawer. */
  noteTitle?: string;
  /** Delete control is teacher-only; readers see the list. Defaults to true. */
  canManage?: boolean;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [deleteTarget, setDeleteTarget] = createSignal<RagOutput | null>(null);
  const [generating, setGenerating] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal("");
  /** Set when a reindex attempt ended without a new output — the truthful state. */
  const [missed, setMissed] = createSignal("");
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (pollTimer) clearTimeout(pollTimer);
    if (copiedTimer) clearTimeout(copiedTimer);
  });

  const [list, { refetch }] = createResource(
    () => (props.active && props.source.listRagOutputs ? props.noteId : null),
    async (noteId) => props.source.listRagOutputs!(noteId, { limit: RAG_PAGE_SIZE }),
  );
  const [capabilities] = createResource(
    () => (props.active && props.source.reindexRag ? true : null),
    () => getAiCapabilities(),
  );

  const outputs = () => list()?.items ?? [];
  const output = () => outputs()[0] ?? null;
  const noteTitle = () => props.noteTitle?.trim() ?? "";
  const passageHeader = (passage: RagOutputPassage) => {
    const source = passage.sourceName
      ?? (passage.fromNote ? noteTitle() || ragOutputMessage(locale(), "noteText") : ragOutputMessage(locale(), "unnamedSource"));
    const pages = ragOutputPassagePages(locale(), passage.pageStart, passage.pageEnd);
    return pages ? `${source} · ${pages}` : source;
  };
  const passagesNote = (read: ReturnType<typeof readRagOutputDocument>) => {
    if (!read.passagesTruncated) return "";
    return read.chunksTotal != null
      ? ragOutputMessage(locale(), "passagesTruncated", { shown: read.passages.length, total: read.chunksTotal })
      : ragOutputMessage(locale(), "passagesTruncatedNoTotal", { shown: read.passages.length });
  };
  const markdown = () => {
    const current = output();
    const read = current ? readRagOutputDocument(current) : null;
    if (!current || !read) return "";
    return buildRagOutputMarkdown({
      title: noteTitle() || ragOutputMessage(locale(), "drawerTitle"),
      date: formatDateTime(current.generated_at, locale()),
      noteTitle: noteTitle(),
      document: read,
      labels: {
        date: ragOutputMessage(locale(), "date"),
        note: ragOutputMessage(locale(), "note"),
        sources: ragOutputMessage(locale(), "sources"),
        failed: ragOutputMessage(locale(), "failedTitle"),
        otherFields: ragOutputMessage(locale(), "otherFields"),
        passages: ragOutputMessage(locale(), "passages"),
        passageHeader,
        passagesTruncated: passagesNote(read),
      },
    });
  };
  const copy = async () => {
    setCopyError("");
    if (!navigator.clipboard?.writeText) {
      setCopyError(ragOutputMessage(locale(), "copyFailed"));
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown());
      setCopied(true);
      copiedTimer = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setCopyError(ragOutputMessage(locale(), "copyFailed"));
    }
  };
  const download = () => {
    const current = output();
    if (!current) return;
    const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ragOutputFileName(current.generated_at);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  // The button is live only when a worker actually serves `rag.index`. A
  // discovery failure is not evidence of absence, so leave it live and let the
  // call itself report; while the list is still loading we do not know either.
  const available = () => {
    if (capabilities.error || capabilities.loading) return true;
    const caps = capabilities();
    if (!caps || caps.enabled === false) return false;
    return caps.capabilities.some((c) => c.capability === RAG_INDEX_CAPABILITY);
  };

  const generate = async () => {
    if (!props.source.reindexRag || generating()) return;
    setError("");
    setMissed("");
    setGenerating(true);
    const previousId = outputs()[0]?.id;
    try {
      await props.source.reindexRag(props.noteId);
      let attempts = 0;
      const poll = async () => {
        if (!props.active) {
          setGenerating(false);
          return;
        }
        attempts += 1;
        const next = await refetch();
        const firstId = next?.items?.[0]?.id;
        if (firstId && firstId !== previousId) {
          setGenerating(false);
          setFlash(t("courseNotes.ragReady"));
          return;
        }
        if (attempts >= 24) {
          // Nothing was produced. Say that plainly: no worker indexed this
          // note, and the button runs the whole call again.
          setGenerating(false);
          setMissed(t("courseNotes.ragNotIndexed"));
          return;
        }
        pollTimer = setTimeout(() => void poll().catch(fail), 2500);
      };
      const fail = (err: unknown) => {
        setGenerating(false);
        setError(formatApiError(err));
      };
      pollTimer = setTimeout(() => void poll().catch(fail), 1500);
    } catch (err) {
      setGenerating(false);
      setError(formatApiError(err));
    }
  };

  const remove = async () => {
    const target = deleteTarget();
    if (!target || !props.source.deleteRagOutput) return;
    setError("");
    try {
      await props.source.deleteRagOutput(props.noteId, target.id);
      await refetch();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <section class="space-y-3 rounded-xl border border-border-line bg-surface-base p-3 sm:p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold">{t("courseNotes.ragTitle")}</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">{t("courseNotes.ragHint")}</p>
        </div>
        {/* Phones: the actions take the full row at touch size, the main one
            stretching, instead of a cluster of 32px targets. */}
        <div class="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:[&_[data-row-actions-trigger]]:h-10 max-sm:[&_[data-row-actions-trigger]]:min-w-10">
          <Show when={props.canManage !== false && props.source.reindexRag}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              class="topbar-ai-control h-8 min-w-[78px] rounded-lg px-2 max-sm:h-10 max-sm:flex-1"
              disabled={!available() || generating()}
              onClick={() => void generate()}
            >
              <IconSparkles class="h-3.5 w-3.5" />
              {generating() ? t("courseNotes.ragGenerating") : t("courseNotes.ragGenerate")}
            </Button>
          </Show>
          <Show when={output() && props.canManage !== false && props.source.deleteRagOutput}>
            <TableRowActions
              label={t("common.actions")}
              triggerLabel={t("common.actions")}
              actions={[{
                label: t("common.delete"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () => setDeleteTarget(output()),
              }]}
            />
          </Show>
          <Show when={output()}>
            <TableRowActions
              label={t("common.export")}
              triggerLabel={t("common.export")}
              actions={[
                { label: ragOutputMessage(locale(), "copy"), icon: <IconCopy class="h-4 w-4" />, onSelect: () => void copy() },
                { label: ragOutputMessage(locale(), "download"), icon: <IconDownload class="h-4 w-4" />, onSelect: download },
                { label: ragOutputMessage(locale(), "print"), icon: <IconFileText class="h-4 w-4" />, onSelect: () => window.print() },
              ]}
            />
          </Show>
        </div>
      </div>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Show when={missed()}>
        <Alert variant="warning">{missed()}</Alert>
      </Show>
      <Show when={copied()}>
        <Alert variant="success">{ragOutputMessage(locale(), "copied")}</Alert>
      </Show>
      <Show when={copyError()}>
        <Alert variant="destructive">{copyError()}</Alert>
      </Show>
      <Show when={!available()}>
        <Alert variant="warning">{t("courseNotes.ragUnavailable")}</Alert>
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={list.error}>
          <Alert variant="destructive">{formatApiError(list.error)}</Alert>
        </Show>
        <Show when={output()} fallback={<p class="text-sm text-muted-foreground">{missed() ? t("courseNotes.ragEmptyFailed") : t("courseNotes.ragEmpty")}</p>}>
          {(current) => (
            <article class="overflow-hidden rounded-lg border border-border/60 bg-background/50">
              <header class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("courseNotes.markdownPreview")}</span>
                <span class="text-xs text-muted-foreground">{formatDateTime(current().generated_at, locale())}</span>
              </header>
              <div class="p-3 sm:p-4">
                <RagOutputContent payload={current().payload} />
              </div>
            </article>
          )}
        </Show>
      </Suspense>
      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={deleteTarget() ? formatDateTime(deleteTarget()?.generated_at ?? 0, locale()) : ""}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
