import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getHomeworkReport } from "@/api/homework";
import type { HomeworkReportEntry } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconEye } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

type ReportTab = "all" | "todo" | "submitted" | "graded";

export function HomeworkReportView(props: { userId: string }) {
  const t = useT();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const [tab, setTab] = createSignal<ReportTab>("all");
  const [report] = createResource(() => props.userId, async (userId) => getHomeworkReport(userId, { limit: 100 }));
  const rows = createMemo(() => {
    const items = report()?.items ?? [];
    if (tab() === "todo") return items.filter((row) => !row.submitted);
    if (tab() === "submitted") return items.filter((row) => row.submitted);
    if (tab() === "graded") return items.filter((row) => row.result !== null);
    return items;
  });
  const statusLabel = (row: HomeworkReportEntry) => {
    if (row.missing) return t("homework.status.missing");
    if (!row.submitted) return t("homework.notSubmitted");
    if (row.result?.status === "done") return t("homework.status.done");
    if (row.result?.status === "incomplete") return t("homework.status.incomplete");
    return t("homework.submitted");
  };
  const columns = createMemo<ColumnDef<HomeworkReportEntry>[]>(() => [
    {
      accessorKey: "title",
      header: t("form.title"),
      cell: (cell) => (
        <div class="min-w-0">
          <p class="truncate font-medium">{cell.row.original.title}</p>
          <p class="truncate text-xs text-muted-foreground">{cell.row.original.subject || "—"}</p>
        </div>
      ),
    },
    {
      id: "due_at",
      accessorFn: (row) => row.due_at,
      header: t("homework.dueAt"),
      meta: { cellClass: "mono whitespace-nowrap text-xs text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.due_at, locale()),
    },
    {
      id: "status",
      header: t("events.status"),
      cell: (cell) => (
        <div class="space-y-1">
          <Badge variant="outline" class="rounded-full">{statusLabel(cell.row.original)}</Badge>
          <Show when={cell.row.original.late}>
            <p class="text-[11px] text-destructive">{t("homework.late")}</p>
          </Show>
        </div>
      ),
    },
    {
      id: "mark",
      header: t("form.mark"),
      meta: { align: "right", cellClass: "font-medium tabular-nums" },
      cell: (cell) => cell.row.original.result?.mark ?? "—",
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("common.view"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => navigate({ to: "/homework/$id", params: { id: cell.row.original.homework } }),
          }]}
        />
      ),
    },
  ]);

  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <Show when={(report()?.items ?? []).length > 0} fallback={<EmptyState title={t("homework.empty")} />}>
        <Tabs value={tab()} onChange={(value) => setTab(value as ReportTab)}>
          <TabsList aria-label={t("homework.title")}>
            <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
            <TabsTrigger value="todo">{t("homework.tab.todo")}</TabsTrigger>
            <TabsTrigger value="submitted">{t("homework.tab.submitted")}</TabsTrigger>
            <TabsTrigger value="graded">{t("homework.tab.graded")}</TabsTrigger>
          </TabsList>
          <TabsContent value={tab()} class="mt-3 border-0 bg-transparent p-0 shadow-none">
            <DataTable
              columns={columns()}
              data={rows()}
              filterColumn="title"
              storageKey={`homework-report-${props.userId}`}
              enablePagination
              pageSize={10}
              empty={t("homework.empty")}
              onRowClick={(row) => navigate({ to: "/homework/$id", params: { id: row.homework } })}
            />
          </TabsContent>
        </Tabs>
      </Show>
    </Suspense>
  );
}
