import { For, Show } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronDown, IconRotateCcw } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";
import type { TableDensity } from "@/lib/table-preferences";

export type ViewMenuColumn = {
  id: string;
  label: string;
  visible: boolean;
  toggle: (visible: boolean) => void;
};

export type DataTableViewMenuProps = {
  columns: ViewMenuColumn[];
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  /** When provided, a "reset column widths" item is shown (resize-enabled tables). */
  onResetWidths?: () => void;
};

const DENSITIES: TableDensity[] = ["compact", "normal", "comfortable"];

/** Column visibility + row density + reset widths menu (bdash DataTableViewMenu port). */
export function DataTableViewMenu(props: DataTableViewMenuProps) {
  const t = useT();
  const densityLabel = (density: TableDensity) =>
    density === "compact"
      ? t("common.densityCompact")
      : density === "comfortable"
        ? t("common.densityComfortable")
        : t("common.densityNormal");

  return (
    <DropdownMenu placement="bottom-end" gutter={6}>
      <DropdownMenuTrigger class="ml-auto inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-card px-3.5 text-sm font-semibold shadow-xs transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
        {t("common.columns")}
        <IconChevronDown class="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-56">
        <Show when={props.columns.length > 0}>
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
          <DropdownMenuSeparator />
        </Show>
        <DropdownMenuLabel>{t("common.rowDensity")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={props.density}
          onChange={(value) => props.onDensityChange(value as TableDensity)}
        >
          <For each={DENSITIES}>
            {(density) => (
              <DropdownMenuRadioItem value={density}>{densityLabel(density)}</DropdownMenuRadioItem>
            )}
          </For>
        </DropdownMenuRadioGroup>
        <Show when={props.onResetWidths}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => props.onResetWidths?.()}>
            <IconRotateCcw class="h-4 w-4" />
            {t("common.resetColumnWidths")}
          </DropdownMenuItem>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
