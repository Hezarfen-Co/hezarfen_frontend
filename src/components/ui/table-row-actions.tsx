import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export function TableRowActions(props: { label: string; actions: TableRowAction[]; compact?: boolean; triggerLabel?: string }) {
  const t = useT();
  const singleAction = () => props.actions.length === 1 ? props.actions[0] : undefined;
  const run = (action: TableRowAction) => {
    if (action.disabled) return;
    setTimeout(action.onSelect, 0);
  };

  return (
    <div class="flex justify-center">
      <Show
        when={singleAction()}
        fallback={<DropdownMenu placement="bottom-end" gutter={6}>
        <DropdownMenuTrigger
          class={props.compact
            ? "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-expanded:bg-muted data-expanded:text-foreground"
            : "inline-flex h-8 min-w-[78px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-muted/45 px-2 text-xs font-semibold text-foreground outline-hidden transition-colors hover:border-primary/30 hover:bg-primary/8 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-ring data-expanded:border-primary/30 data-expanded:bg-primary/10 data-expanded:text-primary-text"}
          data-row-actions-trigger
          aria-label={props.label}
          title={props.label}
        >
          {!props.compact && <span data-row-actions-label>{props.triggerLabel ?? t("common.action")}</span>}
          <IconDotsVertical class="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48">
          <For each={props.actions}>
            {(action) => (
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
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>}
      >
        {(action) => (
          <button
            type="button"
            data-row-actions-trigger
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground outline-hidden transition-colors hover:border-primary/20 hover:bg-primary/8 hover:text-primary-text focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label={action().label}
            title={action().label}
            disabled={action().disabled}
            onClick={(event) => {
              event.stopPropagation();
              run(action());
            }}
          >
            {action().icon}
          </button>
        )}
      </Show>
    </div>
  );
}
