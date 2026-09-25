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
import { formatDate } from "@/lib/format";
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
  // The app-wide "18 Eyl 2026" date, not a numeric 18.09.2026.
  const calculatedDate = (value: number | null | undefined) => formatDate(value, locale());
  // A cell with no value to show wears the same quiet pill as "Analiz yok",
  // so the empty states read as one kind of thing across the row.
  const emptyPill = (row: StudentSignal) => (
    <Badge variant="outline" class={cn("max-w-full rounded-full text-muted-foreground", row.state === "not_loaded" && "animate-pulse")}>
      <span class="truncate">{row.state === "not_loaded" ? rt("notLoaded") : t("insights.noData")}</span>
    </Badge>
  );

  // Widths sum to ~1105px with the action column, so the grid fits a 1440px
  // screen beside the sidebar; at the 120px default every column got, the
  // last one slid under the sticky actions and the table asked to scroll.
  const columns = createMemo<ColumnDef<StudentSignal>[]>(() => [
    {
      id: "student",
      accessorFn: (row) => row.name,
      header: rt("student"),
      size: 120,
      meta: { align: "center" },
      cell: (cell) => (
        <Link to="/ai/insights/$userId" params={{ userId: cell.row.original.id }} class="font-medium text-text-default hover:text-primary-text hover:underline">
          {cell.row.original.name}
        </Link>
      ),
    },
    {
      id: "status",
      size: 118,
      accessorFn: (row) => row.state,
      header: rt("status" as never),
      meta: { align: "center" },
      cell: (cell) => {
        const row = cell.row.original;
        // The badge is one 20px line: the full "no analysis computed" sentence
        // wrapped inside it and spilled over the rows above and below, so the
        // cell shows a short label and the sentence rides in the tooltip.
        const label = row.state === "error"
          ? t("insights.readFailed")
          : row.state === "no_summary" ? t("insights.noAnalysis") : studentStatusText(locale(), row);
        return (
          <Badge
            variant="outline"
            class={cn(
              "max-w-full rounded-full",
              row.state === "ok" && "border-success/30 bg-success/10 text-success-text",
              row.state === "error" && "border-destructive/30 bg-destructive/10 text-destructive-text",
              row.state === "not_loaded" && "animate-pulse",
            )}
            title={row.error ?? (row.state === "no_summary" ? studentStatusText(locale(), row) : undefined)}
          >
            <span class="truncate">{label}</span>
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
      size: 148,
      accessorFn: (row) => row.marks.average ?? -1,
      header: rt("marksAverage"),
      meta: { align: "center" },
      cell: (cell) => loaded(cell.row.original)
        ? <span class="tabular-nums">{studentMarksText(locale(), cell.row.original)}</span>
        : emptyPill(cell.row.original),
    },
    {
      id: "attendance",
      size: 133,
      accessorFn: (row) => (row.attendance.observed > 0 ? row.attendance.rate ?? -1 : -1),
      header: rt("attendanceRate"),
      meta: { align: "center" },
      cell: (cell) => {
        const row = cell.row.original;
        if (!loaded(row) || row.attendance.observed === 0) return emptyPill(row);
        const low = (row.attendance.rate ?? 1) < 0.85;
        return <span class={cn("tabular-nums", low && "font-semibold text-warning-text")}>{studentAttendanceText(locale(), row)}</span>;
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
      size: 97,
      accessorFn: (row) => row.confidence ?? "",
      header: rt("confidence"),
      meta: { align: "center" },
      cell: (cell) => <span class={muted}>{cell.row.original.confidence ? confidenceText(locale(), cell.row.original.confidence) : "—"}</span>,
    },
    {
      id: "computedAt",
      size: 100,
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
