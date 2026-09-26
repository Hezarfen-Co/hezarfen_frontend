import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

type TableRowAction = {
  label: string;
  icon: JSX.Element;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * The one row/header actions control: always a dropdown behind the same
 * action-menu trigger, even for a single action, so every table reads the same.
 * Order is normalised here — view/edit/other items first in the order given,
 * then a separator and the destructive items last. Callers put "view" first
 * and route destructive items through a ConfirmDialog.
 */
export function TableRowActions(props: { label: string; actions: TableRowAction[]; compact?: boolean; triggerLabel?: string }) {
  const t = useT();
  const safeActions = () => props.actions.filter((action) => !action.destructive);
  const destructiveActions = () => props.actions.filter((action) => action.destructive);

  const item = (action: TableRowAction) => (
    <DropdownMenuItem
      class="flex items-center gap-2.5 text-xs"
      destructive={action.destructive}
      disabled={action.disabled}
      // Defer to the next macrotask so the menu fully closes (and
      // restores focus to its trigger) before the action opens a
      // panel/dialog — otherwise the non-modal SidePanel reads that
      // focus-restore as an outside interaction and instantly closes.
      onSelect={() => setTimeout(action.onSelect, 0)}
    >
      {action.icon}
      <span>{action.label}</span>
    </DropdownMenuItem>
  );

  return (
    <div class="flex justify-center">
      <DropdownMenu placement="bottom-end" gutter={6}>
        <DropdownMenuTrigger
          class={props.compact
            ? "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-expanded:bg-muted data-expanded:text-foreground"
            : "inline-flex h-8 min-w-[78px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-muted/45 px-2 text-xs font-semibold text-foreground outline-hidden transition-colors hover:border-border hover:bg-primary/8 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-ring data-expanded:border-border data-expanded:bg-primary/10 data-expanded:text-primary-text"}
          data-row-actions-trigger
          aria-label={props.label}
          title={props.label}
        >
          {!props.compact && <span data-row-actions-label>{props.triggerLabel ?? t("common.action")}</span>}
          <IconDotsVertical class="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48">
          <For each={safeActions()}>{item}</For>
          <Show when={safeActions().length > 0 && destructiveActions().length > 0}>
            <DropdownMenuSeparator />
          </Show>
          <For each={destructiveActions()}>{item}</For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
