import { For, Show, Suspense, createSignal, onCleanup } from "solid-js";
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
import { IconEye, IconSparkles, IconTrash } from "@/components/ui/icons";
import { RagOutputContent } from "@/components/notes/rag-output-content";
import { RagOutputDrawer } from "@/components/notes/rag-output-drawer";
import { ragOutputMessage } from "@/components/notes/rag-output-messages";

const RAG_PAGE_SIZE = 10;

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
  const [viewTarget, setViewTarget] = createSignal<RagOutput | null>(null);
  const [generating, setGenerating] = createSignal(false);
  /** Set when a reindex attempt ended without a new output — the truthful state. */
  const [missed, setMissed] = createSignal("");
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => pollTimer && clearTimeout(pollTimer));

  const [list, { refetch }] = createResource(
    () => (props.active && props.source.listRagOutputs ? props.noteId : null),
    async (noteId) => props.source.listRagOutputs!(noteId, { limit: RAG_PAGE_SIZE }),
  );
  const [capabilities] = createResource(
    () => (props.active && props.source.reindexRag ? true : null),
    () => getAiCapabilities(),
  );

  const outputs = () => list()?.items ?? [];
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
    <section class="space-y-3 rounded-lg border border-border/80 bg-card p-4 shadow-xs dark:border-white/8">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold">{t("courseNotes.ragTitle")}</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">{t("courseNotes.ragHint")}</p>
        </div>
        <Show when={props.canManage !== false && props.source.reindexRag}>
          <Button type="button" size="sm" variant="outline" class="rounded-lg" disabled={!available() || generating()} onClick={() => void generate()}>
            <IconSparkles class="h-4 w-4" />
            {generating() ? t("courseNotes.ragGenerating") : t("courseNotes.ragGenerate")}
          </Button>
        </Show>
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
      <Show when={!available()}>
        <Alert variant="warning">{t("courseNotes.ragUnavailable")}</Alert>
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={list.error}>
          <Alert variant="destructive">{formatApiError(list.error)}</Alert>
        </Show>
        <Show when={outputs().length > 0} fallback={<p class="text-sm text-muted-foreground">{missed() ? t("courseNotes.ragEmptyFailed") : t("courseNotes.ragEmpty")}</p>}>
          <ul class="space-y-3">
            <For each={outputs()}>
              {(output) => (
                <li class="space-y-1.5 rounded-lg border border-border/60 p-3">
                  <div class="flex items-center gap-2">
                    <span class="mono text-xs text-muted-foreground">
                      {formatDateTime(output.generated_at, locale())}
                    </span>
                    <span class="ml-auto">
                      <TableRowActions
                        label={t("common.actions")}
                        actions={[
                          {
                            label: ragOutputMessage(locale(), "view"),
                            icon: <IconEye class="h-4 w-4" />,
                            onSelect: () => setViewTarget(output),
                          },
                          ...(props.canManage !== false && props.source.deleteRagOutput
                            ? [{
                              label: t("common.delete"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setDeleteTarget(output),
                            }]
                            : []),
                        ]}
                      />
                    </span>
                  </div>
                  <button
                    type="button"
                    class="block w-full cursor-pointer rounded-md p-1.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={ragOutputMessage(locale(), "view")}
                    onClick={() => setViewTarget(output)}
                  >
                    <RagOutputContent payload={output.payload} />
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Suspense>
      <RagOutputDrawer
        output={viewTarget()}
        noteTitle={props.noteTitle}
        onOpenChange={(open) => !open && setViewTarget(null)}
      />
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
