import { createMemo, createSignal, type JSX } from "solid-js";
import { Link, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DropdownSelect } from "@/components/ui/select";
import { IconEye } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { runReportText } from "@/i18n/insights-run-report";
import {
  confidenceText,
  studentAttendanceText,
  studentMarksText,
  studentStatusText,
  type StudentSignal,
} from "@/lib/insight-run-report";
import { cn } from "@/lib/cn";
import { matchesSearch } from "@/lib/search-text";
import { usePreferences } from "@/stores/preferences-context";

type Filter = "all" | "attention" | "none";

/**
 * Every student's analysis at a glance: status, attention items, cards, the
 * marks, attendance and focus their summary measured, confidence and when it
 * was computed. Numeric columns sort on the real value; a row opens the
 * student's full analysis page.
 */
export function InsightStudentsTable(props: {
  rows: StudentSignal[];
  title: string;
  description: string;
  empty: string;
  actions?: JSX.Element;
}) {
  const prefs = usePreferences();
  const navigate = useNavigate();
  const locale = () => prefs.locale();
  const t = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const rt = (key: Parameters<typeof runReportText>[1]) => runReportText(locale(), key);
  const [filter, setFilter] = createSignal<Filter>("all");
  const visible = createMemo(() =>
    props.rows.filter((row) =>
      filter() === "attention" ? row.attention > 0 : filter() === "none" ? row.state === "no_summary" : true,
    ),
  );
  const counts = createMemo(() => ({
    all: props.rows.length,
    attention: props.rows.filter((row) => row.attention > 0).length,
    none: props.rows.filter((row) => row.state === "no_summary").length,
  }));
  const loaded = (row: StudentSignal) => row.state === "ok";
  const muted = "text-muted-foreground";
  const calculatedDate = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

  // Widths sum to ~1095px with the action column, so the grid fits a 1440px
  // screen beside the sidebar; at the 120px default every column got, the
  // last one slid under the sticky actions and the table asked to scroll.
  const columns = createMemo<ColumnDef<StudentSignal>[]>(() => [
    {
      id: "student",
      accessorFn: (row) => row.name,
      header: rt("student"),
      size: 130,
      meta: { align: "center" },
      cell: (cell) => (
        <Link to="/ai/insights/$userId" params={{ userId: cell.row.original.id }} class="font-medium text-text-default hover:text-primary-text hover:underline">
          {cell.row.original.name}
        </Link>
      ),
    },
    {
      id: "status",
      size: 110,
      accessorFn: (row) => row.state,
      header: rt("status" as never),
      meta: { align: "center" },
      cell: (cell) => {
        const row = cell.row.original;
        return (
          <Badge
            variant="outline"
            class={cn(
              "rounded-full",
              row.state === "ok" && "border-success/30 bg-success/10 text-success-text",
              row.state === "error" && "border-destructive/30 bg-destructive/10 text-destructive-text",
              row.state === "not_loaded" && "animate-pulse",
            )}
            title={row.error ?? undefined}
          >
            {row.state === "error" ? t("insights.readFailed") : studentStatusText(locale(), row)}
          </Badge>
        );
      },
    },
    {
      id: "attention",
      size: 95,
      accessorFn: (row) => row.attention,
      header: rt("attention"),
      meta: { align: "center" },
      cell: (cell) => (
        <span class={cn("tabular-nums", cell.row.original.attention > 0 ? "font-semibold text-warning-text" : muted)}>
          {loaded(cell.row.original) || cell.row.original.state === "no_summary" ? cell.row.original.attention : "—"}
        </span>
      ),
    },
    {
      id: "cards",
      size: 95,
      accessorFn: (row) => row.cards,
      header: rt("cards"),
      meta: { align: "center" },
      cell: (cell) => <span class="tabular-nums">{cell.row.original.state === "not_loaded" ? "—" : cell.row.original.cards}</span>,
    },
    {
      id: "marks",
      size: 135,
      accessorFn: (row) => row.marks.average ?? -1,
      header: rt("marksAverage"),
      meta: { align: "center" },
      cell: (cell) => <span class={cn("tabular-nums", !loaded(cell.row.original) && muted)}>{studentMarksText(locale(), cell.row.original)}</span>,
    },
    {
      id: "attendance",
      size: 125,
      accessorFn: (row) => (row.attendance.observed > 0 ? row.attendance.rate ?? -1 : -1),
      header: rt("attendanceRate"),
      meta: { align: "center" },
      cell: (cell) => {
        const row = cell.row.original;
        const low = loaded(row) && row.attendance.observed > 0 && (row.attendance.rate ?? 1) < 0.85;
        return <span class={cn("tabular-nums", low && "font-semibold text-warning-text", !loaded(row) && muted)}>{studentAttendanceText(locale(), row)}</span>;
      },
    },
    {
      id: "study",
      size: 95,
      accessorFn: (row) => row.study.stints,
      header: t("insights.studyStints"),
      meta: { align: "center" },
      cell: (cell) => <span class={cn("tabular-nums", !loaded(cell.row.original) && muted)}>{loaded(cell.row.original) ? cell.row.original.study.stints : "—"}</span>,
    },
    {
      id: "confidence",
      size: 105,
      accessorFn: (row) => row.confidence ?? "",
      header: rt("confidence"),
      meta: { align: "center" },
      cell: (cell) => <span class={muted}>{cell.row.original.confidence ? confidenceText(locale(), cell.row.original.confidence) : "—"}</span>,
    },
    {
      id: "computedAt",
      size: 95,
      accessorFn: (row) => row.computed_at ?? 0,
      header: t("insights.computedAt"),
      meta: { align: "center", cellClass: "text-xs text-muted-foreground whitespace-nowrap" },
      cell: (cell) => calculatedDate(cell.row.original.computed_at),
    },
    {
      id: "actions",
      header: t("common.actions"),
      enableSorting: false,
      meta: {
        align: "center",
        headerClass: "text-center",
        cellClass: "text-center",
      },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("insights.viewAnalysis"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => void navigate({ to: "/ai/insights/$userId", params: { userId: cell.row.original.id } }),
          }]}
        />
      ),
    },
  ]);

  const filters = createMemo(() => [
    { value: "all" as Filter, label: `${t("insights.filter.all")} (${counts().all})` },
    { value: "attention" as Filter, label: `${t("insights.filter.attention")} (${counts().attention})` },
    { value: "none" as Filter, label: `${t("insights.filter.noAnalysis")} (${counts().none})` },
  ]);

  return (
    <DataTable
      title={props.title}
      description={props.description}
      actions={props.actions}
      columns={columns()}
      data={visible()}
      onRowClick={(row) => void navigate({ to: "/ai/insights/$userId", params: { userId: row.id } })}
      empty={props.empty}
      emptyIllustration="people"
      filterPlaceholder={t("insights.searchStudents")}
      filterHint={t("search.hint.people")}
      searchPredicate={(row, query) => matchesSearch(query, row.name)}
      filters={
        <DropdownSelect
          options={filters()}
          value={filter()}
          onChange={setFilter}
          labelPrefix={t("common.filter")}
          class="min-w-44"
        />
      }
      enablePagination
      pageSize={10}
      tableClass="insight-grid-table min-w-[60rem]"
      storageKey="insight-students-v2"
    />
  );
}
