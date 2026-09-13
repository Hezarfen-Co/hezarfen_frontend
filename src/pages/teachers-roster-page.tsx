import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { For, Show, Suspense, createMemo, createResource } from "solid-js";
import { getClasses } from "@/api/classes";
import { getUserSearch } from "@/api/users";
import { formatApiError, type PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { RosterPersonCell } from "@/components/users/roster-person-cell";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge, ComingSoonValue } from "@/components/ui/coming-soon";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye, IconPlus, IconUploadCloud } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/stores/preferences-context";

const ROSTER_PAGE_SIZE = 10;

type TeacherRow = { person: PersonRef; homeroomClasses: number };

export default function TeachersRosterPage() {
  return (
    <RouteGuard minRole="manager">
      <TeachersRosterContent />
    </RouteGuard>
  );
}

// ADM-08. "Sınıf" is the number of classes the teacher is homeroom teacher of
// (ClassGroup.teacher); branch, weekly load, AI acceptance and employment
// status have no field anywhere, so they stay "yakında".
function TeachersRosterContent() {
  const t = useT();
  const navigate = useNavigate();

  const [data, { refetch }] = createResource(async () => {
    const [teachers, classes] = await Promise.all([getUserSearch("", undefined, "teacher"), getClasses()]);
    const homeroom = new Map<string, number>();
    for (const cls of classes.items) {
      if (cls.teacher) homeroom.set(cls.teacher.id, (homeroom.get(cls.teacher.id) ?? 0) + 1);
    }
    return teachers.items.map<TeacherRow>((person) => ({ person, homeroomClasses: homeroom.get(person.id) ?? 0 }));
  });

  const open = (row: TeacherRow) => void navigate({ to: "/profile/$userId", params: { userId: row.person.id } });

  const columns = createMemo<ColumnDef<TeacherRow>[]>(() => [
    { id: "teacher", size: 220, header: t("roster.teacher"), cell: (cell) => <RosterPersonCell person={cell.row.original.person} /> },
    { id: "branch", size: 130, header: t("roster.branch"), enableSorting: false, cell: () => <ComingSoonValue /> },
    {
      accessorKey: "homeroomClasses",
      size: 90,
      header: t("roster.class"),
      meta: { cellClass: "mono tabular-nums" },
      cell: (cell) => (cell.row.original.homeroomClasses > 0 ? cell.row.original.homeroomClasses : "—"),
    },
    { id: "weekly", size: 130, header: t("roster.weeklyLessons"), enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "acceptance", size: 130, header: t("roster.suggestionAcceptance"), enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "status", size: 130, header: t("roster.status"), enableSorting: false, cell: () => <ComingSoonValue /> },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{ label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => open(cell.row.original) }]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-5">
      <Tabs value="all">
        <TabsList>
          <TabsTrigger value="all">{t("roster.tabAll")}</TabsTrigger>
          <For each={["roster.tabPermanent", "roster.tabContract", "roster.tabAdvisor"] as const}>
            {(key) => (
              <TabsTrigger value={key} disabled title={t("comingSoon.title")}>
                {t(key)}
                <ComingSoonBadge class="ml-1.5" />
              </TabsTrigger>
            )}
          </For>
        </TabsList>
      </Tabs>

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-text-strong">{t("nav.teachersRoster")}</h1>
          <p class="text-sm text-text-subtle">{t("roster.teachersSubtitle")}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
            <IconUploadCloud class="h-4 w-4" />
            {t("roster.import")}
            <ComingSoonBadge class="ml-1.5" />
          </Button>
          <Button size="sm" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
            <IconPlus class="h-4 w-4" />
            {t("roster.addTeacher")}
            <ComingSoonBadge class="ml-1.5" />
          </Button>
        </div>
      </div>

      <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
        <Show when={data.error}>
          <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
        </Show>
        <Show when={!data.error && data()}>
          {(rows) => (
            <DataTable
              columns={columns()}
              data={rows()}
              tableClass="min-w-[940px]"
              empty={t("roster.noTeachers")}
              filterPlaceholder={t("roster.searchTeachers")}
              searchPredicate={(row, query) =>
                [row.person.username, row.person.display_name ?? ""].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())
              }
              enablePagination
              pageSize={ROSTER_PAGE_SIZE}
              storageKey="teachers-roster"
              onRowClick={open}
            />
          )}
        </Show>
      </Suspense>
    </div>
  );
}
