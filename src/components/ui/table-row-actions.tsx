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
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground/80 opacity-90 outline-none transition-all duration-150 hover:bg-secondary hover:text-foreground hover:opacity-100 active:scale-[0.96] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-secondary data-[expanded]:text-foreground data-[expanded]:opacity-100 sm:group-hover:opacity-100 sm:group-hover/row:opacity-100"
          aria-label={props.label}
        >
          <IconDotsVertical class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-48 rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-popover/95 backdrop-blur-xl p-1.5 shadow-apple">
          <For each={props.actions}>
            {(action) => (
              <DropdownMenuItem
                class="flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-medium"
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
