import { Show, createEffect, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Board } from "@/api/boards";
import { BoardBulkInvite } from "@/components/whiteboard/board-bulk-invite";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useT } from "@/stores/preferences-context";

type ParticipantRow = {
  id: string;
  name: string;
  role: string;
  creator: boolean;
};

export function BoardSettingsPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: () => string;
  title: () => string;
  participants: () => string[];
  creatorId: () => string;
  canManageParticipants: () => boolean;
  canSearchPeople: () => boolean;
  nameOf: (id: string) => string;
  roleOf: (id: string) => string;
  onTitleSave: (title: string) => Promise<void>;
  onParticipantsSave: (participants: string[]) => Promise<void>;
  onInvited: (board: Board) => void;
}) {
  const t = useT();
  const [title, setTitle] = createSignal("");
  const [personId, setPersonId] = createSignal("");
  const [removeTarget, setRemoveTarget] = createSignal<ParticipantRow | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    if (props.open) {
      setTitle(props.title());
      setPersonId("");
      setError("");
    }
  });

  const rows = createMemo<ParticipantRow[]>(() =>
    props.participants().map((id) => ({
      id,
      name: props.nameOf(id),
      role: props.roleOf(id),
      creator: id === props.creatorId(),
    })),
  );

  const saveTitle = async () => {
    const next = title().trim();
    if (!next || next === props.title()) return;
    setPending(true);
    setError("");
    try {
      await props.onTitleSave(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const saveParticipants = async (ids: string[]) => {
    setPending(true);
    setError("");
    try {
      await props.onParticipantsSave(ids);
      setPersonId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const columns = createMemo<ColumnDef<ParticipantRow>[]>(() => [
    {
      accessorKey: "name",
      header: t("whiteboard.participants"),
      cell: (cell) => (
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{cell.row.original.name}</p>
          <Show when={cell.row.original.role}><p class="text-xs text-muted-foreground">{cell.row.original.role}</p></Show>
        </div>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { align: "center", label: t("common.actions") },
      cell: (cell) => (
        <Show
          when={props.canManageParticipants() && !cell.row.original.creator}
          fallback={<span class="text-xs text-muted-foreground">{cell.row.original.creator ? t("whiteboard.creator") : "—"}</span>}
        >
          <TableRowActions
            label={t("common.actions")}
            actions={[{
              label: t("whiteboard.removeParticipant"),
              icon: <span class="text-base leading-none">×</span>,
              destructive: true,
              disabled: pending(),
              onSelect: () => setRemoveTarget(cell.row.original),
            }]}
          />
        </Show>
      ),
    },
  ]);

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("whiteboard.edit")} size="wide">
      <div class="space-y-6">
        <Show when={error()}><ErrorAlert message={error()} /></Show>
        <section class="space-y-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
          <div>
            <h3 class="text-sm font-semibold">{t("whiteboard.titleLabel")}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{t("whiteboard.edit")}</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div class="space-y-1.5">
              <Label for="whiteboard-title" class="sr-only">{t("whiteboard.titleLabel")}</Label>
              <Input id="whiteboard-title" maxlength={200} value={title()} onInput={(event) => setTitle(event.currentTarget.value)} />
            </div>
            <Button type="button" size="sm" class="rounded-lg" disabled={pending() || !title().trim() || title().trim() === props.title()} onClick={() => void saveTitle()}>
              {t("common.save")}
            </Button>
          </div>
        </section>

        <section class="space-y-3">
          <Show when={props.canManageParticipants()} fallback={<p class="text-xs text-muted-foreground">{t("whiteboard.creator")}</p>}>
            <Show
              when={props.canSearchPeople()}
              fallback={<p class="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">{t("form.searchNoPermission")}</p>}
            >
              <UserSearchSelect
                id="whiteboard-add-participant"
                value={personId()}
                onChange={(id) => {
                  setPersonId(id);
                  if (id && !props.participants().includes(id)) void saveParticipants([...props.participants(), id]);
                }}
                excludeIds={props.participants()}
                placeholder={t("whiteboard.addParticipant")}
              />
            </Show>
          </Show>
          <DataTable
            columns={columns()}
            data={rows()}
            empty={t("whiteboard.empty")}
            title={t("whiteboard.participants")}
            description={t("whiteboard.participantsHint")}
            class="rounded-lg border border-border/70 bg-card p-4 shadow-sm"
            tableClass="min-w-[26rem]"
            enableColumnVisibility={false}
            enableSorting={false}
            enablePagination
            pageSize={8}
          />
        </section>

        <ConfirmDialog
          open={removeTarget() != null}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          title={t("whiteboard.removeParticipant")}
          variant="destructive"
          summary={removeTarget()?.name ?? ""}
          onConfirm={async () => {
            const target = removeTarget();
            if (!target) return;
            await saveParticipants(props.participants().filter((id) => id !== target.id));
            setRemoveTarget(null);
          }}
        />

        {/* Inviting a whole group is the creator's alone, exactly like the
            roster edits above. */}
        <Show when={props.canManageParticipants()}>
          <BoardBulkInvite
            boardId={props.boardId}
            visible={props.canManageParticipants}
            participantCount={() => props.participants().length}
            onInvited={props.onInvited}
          />
        </Show>
      </div>
    </SidePanel>
  );
}
