import { Show, createEffect, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
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
  title: () => string;
  participants: () => string[];
  creatorId: () => string;
  canManageParticipants: () => boolean;
  canSearchPeople: () => boolean;
  nameOf: (id: string) => string;
  roleOf: (id: string) => string;
  onTitleSave: (title: string) => Promise<void>;
  onParticipantsSave: (participants: string[]) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = createSignal("");
  const [personId, setPersonId] = createSignal("");
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
      meta: { align: "center" },
      cell: (cell) => (
        <Show
          when={props.canManageParticipants() && !cell.row.original.creator}
          fallback={<span class="text-xs text-muted-foreground">{cell.row.original.creator ? t("whiteboard.creator") : "—"}</span>}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 rounded-lg px-2 text-xs"
            disabled={pending()}
            onClick={() => void saveParticipants(props.participants().filter((id) => id !== cell.row.original.id))}
          >
            {t("whiteboard.removeParticipant")}
          </Button>
        </Show>
      ),
    },
  ]);

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("whiteboard.edit")} size="wide">
      <div class="space-y-6">
        <Show when={error()}><ErrorAlert message={error()} /></Show>
        <section class="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <Label for="whiteboard-title">{t("whiteboard.titleLabel")}</Label>
          <div class="flex flex-wrap gap-2">
            <Input id="whiteboard-title" class="min-w-0 flex-1" maxlength={200} value={title()} onInput={(event) => setTitle(event.currentTarget.value)} />
            <Button type="button" size="sm" class="rounded-lg" disabled={pending() || !title().trim() || title().trim() === props.title()} onClick={() => void saveTitle()}>
              {t("common.save")}
            </Button>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <div>
            <h3 class="text-sm font-semibold">{t("whiteboard.participants")}</h3>
            <p class="mt-1 text-xs text-muted-foreground">{t("whiteboard.participantsHint")}</p>
          </div>
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
            class="overflow-hidden rounded-xl border border-border/70 bg-background/40"
            tableClass="min-w-[32rem]"
            enableColumnVisibility={false}
            enableSorting={false}
            enablePagination
            pageSize={8}
          />
        </section>
      </div>
    </SidePanel>
  );
}
