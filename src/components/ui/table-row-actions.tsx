import type { JSX } from "solid-js";
import { For } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@/components/ui/icons";

type TableRowAction = {
  label: string;
  icon: JSX.Element;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function TableRowActions(props: { label: string; actions: TableRowAction[] }) {
  return (
    <div class="flex justify-center">
      <DropdownMenu placement="bottom-end" gutter={6}>
        <DropdownMenuTrigger
          class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-transparent text-muted-foreground outline-hidden transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-expanded:bg-muted data-expanded:text-foreground"
          aria-label={props.label}
          title={props.label}
        >
          <IconDotsVertical class="h-4 w-4" />
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
      </DropdownMenu>
    </div>
  );
}
