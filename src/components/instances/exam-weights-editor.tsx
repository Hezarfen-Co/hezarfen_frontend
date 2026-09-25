import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { formatApiError } from "@/api/client";
import type { ExamWeightEntry } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { examKindLabel } from "@/lib/exam-labels";
import { useT } from "@/stores/preferences-context";

/**
 * An exam-kind weight map. `editing` opens the set-a-weight panel (the parent
 * owns its header button); rows can be edited or removed when `canEdit`.
 */
export function ExamWeightsEditor(props: {
  weights: ExamWeightEntry[];
  /** The kinds the school runs (settings.exam_kinds), for the picker. */
  kinds: string[];
  canEdit: boolean;
  onSet: (entry: ExamWeightEntry) => Promise<void>;
  onRemove?: (kind: string) => Promise<void>;
  editing: ExamWeightEntry | "new" | null;
  onEditingChange: (entry: ExamWeightEntry | "new" | null) => void;
}) {
  const t = useT();
  const [kind, setKind] = createSignal("");
  const [weight, setWeight] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [removeError, setRemoveError] = createSignal("");

  const remove = async (kind: string) => {
    setRemoveError("");
    try {
      await props.onRemove?.(kind);
    } catch (err) {
      setRemoveError(formatApiError(err));
    }
  };

  createEffect(() => {
    const target = props.editing;
    if (target === null) return;
    setKind(target === "new" ? props.kinds.find((k) => !props.weights.some((w) => w.kind === k)) ?? props.kinds[0] ?? "" : target.kind);
    setWeight(target === "new" ? "" : String(target.weight));
    setError("");
  });

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    const value = Number(weight().trim());
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setError(t("instances.weightInvalid"));
      return;
    }
    setPending(true);
    try {
      await props.onSet({ kind: kind(), weight: value });
      props.onEditingChange(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const columns = createMemo<ColumnDef<ExamWeightEntry>[]>(() => [
    {
      id: "kind",
      accessorFn: (row) => examKindLabel(row.kind, t),
      header: t("instances.examKind"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "weight",
      accessorFn: (row) => row.weight,
      header: t("instances.weight"),
      meta: { cellClass: "tabular-nums" },
    },
    ...(props.canEdit
      ? [
          {
            id: "actions",
            header: t("common.actions"),
            meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
            cell: (cell) => (
              <TableRowActions
                label={t("common.actions")}
                actions={[
                  { label: t("instances.setWeight"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => props.onEditingChange(cell.row.original) },
                  ...(props.onRemove
                    ? [{ label: t("instances.removeWeight"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => void remove(cell.row.original.kind) }]
                    : []),
                ]}
              />
            ),
          } satisfies ColumnDef<ExamWeightEntry>,
        ]
      : []),
  ]);

  return (
    <>
      <Show when={removeError()}><Alert variant="destructive">{removeError()}</Alert></Show>
      <DataTable columns={columns()} data={props.weights} empty={t("common.noMatches")} />
      <SidePanel
        open={props.editing !== null}
        onOpenChange={(open) => !open && props.onEditingChange(null)}
        title={props.editing === "new" ? t("instances.addWeight") : t("instances.setWeight")}
        description={t("instances.examWeightsHelp")}
      >
        <form class="space-y-4" noValidate onSubmit={save}>
          <div class="space-y-1.5">
            <Label for="weight-kind">{t("instances.examKind")}</Label>
            <Select id="weight-kind" value={kind()} disabled={props.editing !== "new"} onChange={(e) => setKind(e.currentTarget.value)}>
              <For each={props.kinds}>{(k) => <option value={k}>{examKindLabel(k, t)}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="weight-value">{t("instances.weight")}</Label>
            <Input id="weight-value" type="number" inputMode="numeric" min={1} max={100} value={weight()} onInput={(e) => setWeight(e.currentTarget.value)} />
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4">
            <Button type="submit" disabled={pending() || !kind()}>{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => props.onEditingChange(null)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>
    </>
  );
}
