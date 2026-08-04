import { createMemo } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { BlueprintSkip } from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { SidePanel } from "@/components/ui/side-panel";
import { skipReasonCopy } from "@/lib/blueprint-skip";
import { useT } from "@/stores/preferences-context";

export function BlueprintSkippedReport(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skipped: BlueprintSkip[];
  /** Resolves a course id to its title; falls back to the id when unknown. */
  courseTitle: (id: string) => string;
}) {
  const t = useT();

  const columns = createMemo<ColumnDef<BlueprintSkip>[]>(() => [
    {
      id: "class",
      accessorFn: (row) => row.class_name || row.class,
      header: t("classBlueprints.skippedClass"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "course",
      accessorFn: (row) => props.courseTitle(row.course),
      header: t("classBlueprints.skippedCourse"),
    },
    {
      id: "reason",
      accessorFn: (row) => {
        const copy = skipReasonCopy(row.reason, props.courseTitle(row.course));
        return t(copy.key, copy.vars);
      },
      header: t("classBlueprints.skippedReason"),
      meta: { cellClass: "text-muted-foreground" },
    },
  ]);

  return (
    <SidePanel
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t("classBlueprints.skippedTitle")}
      description={t("classBlueprints.skippedSubtitle")}
      size="wide"
    >
      <DataTable columns={columns()} data={props.skipped} />
    </SidePanel>
  );
}
