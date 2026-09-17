import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getClassMembers, getClasses } from "@/api/classes";
import { getAcademicYears } from "@/api/academic-years";
import { getUserSearch } from "@/api/users";
import { formatApiError, type ClassGroup, type PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { RosterPersonCell } from "@/components/users/roster-person-cell";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge, ComingSoonValue } from "@/components/ui/coming-soon";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye, IconPlus, IconUploadCloud } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/stores/preferences-context";

const ROSTER_PAGE_SIZE = 10;

type StudentRow = { person: PersonRef; classes: ClassGroup[] };

export default function StudentsRosterPage() {
  return (
    <RouteGuard minRole="manager">
      <StudentsRosterContent />
    </RouteGuard>
  );
}

// ADM-02. The roster, class and term are real; topic mastery, plan adherence
// and the risk status are AI/analytics fields no endpoint serves, so their
// columns keep the design's slot and say "yakında" instead of a number.
function StudentsRosterContent() {
  const t = useT();
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = createSignal("");
  const [yearFilter, setYearFilter] = createSignal("");

  const [data, { refetch }] = createResource(async () => {
    const [students, classes, years] = await Promise.all([
      getUserSearch("", undefined, "student"),
      getClasses(),
      getAcademicYears().catch(() => ({ items: [] })),
    ]);
    // No endpoint maps students to classes in bulk; one members read per class
    // is bounded by the class count, not the student count.
    const memberships = await Promise.all(
      classes.items.map(async (cls) => ({ cls, members: (await getClassMembers(cls.id)).items })),
    );
    const byStudent = new Map<string, ClassGroup[]>();
    for (const { cls, members } of memberships) {
      for (const member of members) byStudent.set(member.user.id, [...(byStudent.get(member.user.id) ?? []), cls]);
    }
    const rows: StudentRow[] = students.items.map((person) => ({ person, classes: byStudent.get(person.id) ?? [] }));
    return { rows, classes: classes.items, years: years.items };
  });

  const rows = createMemo(() =>
    (data()?.rows ?? []).filter((row) => {
      if (classFilter() && !row.classes.some((cls) => cls.id === classFilter())) return false;
      if (yearFilter() && !row.classes.some((cls) => cls.year === yearFilter())) return false;
      return true;
    }),
  );

  const open = (row: StudentRow) => void navigate({ to: "/profile/$userId", params: { userId: row.person.id } });

  const columns = createMemo<ColumnDef<StudentRow>[]>(() => [
    {
      id: "student", size: 220,
      header: t("roster.student"),
      cell: (cell) => <RosterPersonCell person={cell.row.original.person} />,
    },
    {
      id: "class",
      size: 90,
      header: t("roster.class"),
      cell: (cell) => (
        <span class="truncate text-sm">{cell.row.original.classes.map((cls) => cls.name).join(", ") || "—"}</span>
      ),
    },
    { id: "mastery", size: 130, header: t("roster.mastery"), enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "attendance", size: 130, header: t("roster.attendance"), enableSorting: false, cell: () => <ComingSoonValue /> },
    { id: "plan", size: 130, header: t("roster.planAdherence"), enableSorting: false, cell: () => <ComingSoonValue /> },
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
          <For each={["roster.tabActive", "roster.tabNew", "roster.tabAtRisk", "roster.tabLeft"] as const}>
            {(key) => (
              <TabsTrigger value={key} disabled title={t("comingSoon.title")}>
                {t(key)}
                <ComingSoonBadge class="ml-1.5" />
              </TabsTrigger>
            )}
          </For>
        </TabsList>
      </Tabs>


      <section class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={data.error}>
            <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
          </Show>
          <Show when={!data.error && data()}>
            {(value) => (
              <DataTable
                title={t("nav.studentsRoster")}
                description={t("roster.studentsSubtitle")}
                actions={<><Button size="sm" variant="outline" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
            <IconUploadCloud class="h-4 w-4" />
            {t("roster.import")}
            <ComingSoonBadge class="ml-1.5" />
          </Button>
          <Button size="sm" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
            <IconPlus class="h-4 w-4" />
            {t("roster.addStudent")}
            <ComingSoonBadge class="ml-1.5" />
          </Button></>}
                columns={columns()}
                data={rows()}
                tableClass="min-w-[940px]"
                empty={t("form.noStudents")}
                filterPlaceholder={t("roster.searchStudents")}
                filterHint={t("search.hint.students")}
                searchPredicate={(row, query) =>
                  [row.person.username, row.person.display_name ?? ""].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())
                }
                filters={
                  <>
                    <Select aria-label={t("roster.class")} value={classFilter()} onChange={(e) => setClassFilter(e.currentTarget.value)} wrapperClass="w-auto">
                      <option value="">{t("roster.classAll")}</option>
                      <For each={value().classes}>{(cls) => <option value={cls.id}>{cls.name}</option>}</For>
                    </Select>
                    <Select aria-label={t("academicYears.year")} value={yearFilter()} onChange={(e) => setYearFilter(e.currentTarget.value)} wrapperClass="w-auto">
                      <option value="">{t("common.all")}</option>
                      <For each={value().years}>{(year) => <option value={year.id}>{year.name}</option>}</For>
                    </Select>
                  </>
                }
                enablePagination
                pageSize={ROSTER_PAGE_SIZE}
                storageKey="students-roster"
                onRowClick={open}
              />
            )}
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
