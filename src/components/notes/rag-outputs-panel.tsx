import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { RagOutput } from "@/api/client";
import type { NoteFileSource } from "@/lib/note-source";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";
import { IconTrash } from "@/components/ui/icons";

const RAG_PAGE_SIZE = 10;

export function RagOutputsPanel(props: {
  noteId: string;
  active: boolean;
  source: NoteFileSource;
  /** Delete control is teacher-only; readers see the list. Defaults to true. */
  canManage?: boolean;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [deleteTarget, setDeleteTarget] = createSignal<RagOutput | null>(null);

  const [list, { refetch }] = createResource(
    () => (props.active && props.source.listRagOutputs ? props.noteId : null),
    async (noteId) => props.source.listRagOutputs!(noteId, { limit: RAG_PAGE_SIZE }),
  );

  const outputs = () => list()?.items ?? [];

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
      <h3 class="text-sm font-semibold">{t("courseNotes.ragTitle")}</h3>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={list.error}>
          <Alert variant="destructive">{formatApiError(list.error)}</Alert>
        </Show>
        <Show when={outputs().length > 0} fallback={<p class="text-sm text-muted-foreground">{t("courseNotes.ragEmpty")}</p>}>
          <ul class="space-y-3">
            <For each={outputs()}>
              {(output) => (
                <li class="space-y-1.5 rounded-lg border border-border/60 p-3">
                  <div class="flex items-center gap-2">
                    <span class="mono text-xs text-muted-foreground">
                      {formatDateTime(output.generated_at, locale())}
                    </span>
                    <span class="ml-auto">
                      <Show when={props.canManage !== false && props.source.deleteRagOutput}>
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[
                            {
                              label: t("common.delete"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setDeleteTarget(output),
                            },
                          ]}
                        />
                      </Show>
                    </span>
                  </div>
                  <pre class="overflow-x-auto whitespace-pre-wrap text-xs leading-5">{JSON.stringify(output.payload, null, 2)}</pre>
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
        summary={deleteTarget() ? formatDateTime(deleteTarget()?.generated_at ?? 0, locale()) : ""}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
