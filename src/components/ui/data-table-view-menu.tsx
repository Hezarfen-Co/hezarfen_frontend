import { For } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronDown } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

export type ViewMenuColumn = {
  id: string;
  label: string;
  visible: boolean;
  toggle: (visible: boolean) => void;
};

export type DataTableViewMenuProps = {
  columns: ViewMenuColumn[];
};

/** Column visibility menu (rounded-lg, no density/resize controls). */
export function DataTableViewMenu(props: DataTableViewMenuProps) {
  const t = useT();

  return (
    <DropdownMenu placement="bottom-end" gutter={6}>
      <DropdownMenuTrigger class="ml-auto inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border/70 bg-muted/40 px-3 text-[13px] font-medium transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
        {t("common.columns")}
        <IconChevronDown class="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <DropdownMenuLabel>{t("common.visibleColumns")}</DropdownMenuLabel>
        <For each={props.columns}>
          {(column) => (
            <DropdownMenuCheckboxItem
              checked={column.visible}
              onChange={(value) => column.toggle(!!value)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          )}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
