import { For, Show } from "solid-js";
import type { MealDish } from "@/api/client";
import { IconAlert, IconEdit, IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { dietaryTagLabel, formatTry } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** A dish line: name, optional description, tags, price; managers get a row menu. */
export function MealDishRow(props: {
  dish: MealDish;
  moneyLocale: string;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const conflicting = (tag: string) => props.dish.conflicts.includes(tag);
  return (
    <li class="flex items-start gap-4 px-4 py-2.5">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-text-strong">{props.dish.name}</p>
        <Show when={props.dish.description}>
          <p class="mt-0.5 text-sm text-muted-foreground">{props.dish.description}</p>
        </Show>
        <Show when={props.dish.tags.length > 0}>
          <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <For each={props.dish.tags}>
              {(tag) => (
                <span class={conflicting(tag) ? "inline-flex items-center gap-1 font-medium text-warning-text" : undefined}>
                  <Show when={conflicting(tag)}><IconAlert class="h-3.5 w-3.5" /></Show>
                  {dietaryTagLabel(tag, t)}
                </span>
              )}
            </For>
          </p>
        </Show>
      </div>
      <span class="shrink-0 font-medium tabular-nums">{formatTry(props.dish.price_minor, props.moneyLocale)}</span>
      <Show when={props.canManage}>
        <TableRowActions
          compact
          label={t("common.actions")}
          actions={[
            { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: props.onEdit },
            { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: props.onDelete },
          ]}
        />
      </Show>
    </li>
  );
}
