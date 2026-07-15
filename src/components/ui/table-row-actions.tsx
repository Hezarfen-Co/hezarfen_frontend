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
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-muted data-[expanded]:text-foreground"
          aria-label={props.label}
        >
          <IconDotsVertical class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-44 rounded-lg border-border/80 p-1 shadow-soft">
          <For each={props.actions}>
            {(action) => (
              <DropdownMenuItem
                class="rounded-md"
                destructive={action.destructive}
                disabled={action.disabled}
                onSelect={action.onSelect}
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
