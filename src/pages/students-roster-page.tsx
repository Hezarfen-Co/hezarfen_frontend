import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { matchesSearch } from "@/lib/search-text";
import { createUrlString } from "@/lib/url-state";
import { getClassMembers, getClasses } from "@/api/classes";
import { getAcademicYears } from "@/api/academic-years";
import { getUserSearch } from "@/api/users";
import { formatApiError, type ClassGroup, type PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { CreateUserPanel } from "@/components/users/create-user-panel";
import { RosterPersonCell } from "@/components/users/roster-person-cell";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { useT } from "@/stores/preferences-context";
import { useAuth } from "@/stores/auth-context";
import { sortByClass } from "@/lib/student-directory";

const ROSTER_PAGE_SIZE = 10;

type StudentRow = { person: PersonRef; classes: ClassGroup[] };

export default function StudentsRosterPage() {
  return (
    <RouteGuard minRole="manager">
      <StudentsRosterContent />
    </RouteGuard>
  );
}

// ADM-02. The roster, class and term are real. Topic mastery, plan adherence
// and the risk status are AI/analytics fields no endpoint serves, and a
// per-student attendance rate would cost one report read per row, so those
// design columns are left out rather than filled with "yakında".
function StudentsRosterContent() {
  const t = useT();
  const auth = useAuth();
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = createUrlString("class");
  const [yearFilter, setYearFilter] = createUrlString("year");
  const [creating, setCreating] = createSignal(false);

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
    const rows: StudentRow[] = sortByClass(students.items.map((person) => ({ person, classes: byStudent.get(person.id) ?? [] })));
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
      <section class="space-y-4 p-0">
        <Suspense fallback={<DataTableSkeleton columns={3} rows={8} />}>
          <Show when={data.error}>
            <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
          </Show>
          <Show when={!data.error && data()}>
            {(value) => (
              <DataTable
                urlState
                pageResetKey={`${classFilter()}|${yearFilter()}`}
                filtersActive={classFilter() !== "" || yearFilter() !== ""}
                onClearFilters={() => {
                  setClassFilter("");
                  setYearFilter("");
                }}
                surfaceSections
                title={t("nav.studentsRoster")}
                description={t("roster.studentsSubtitle")}
                actions={<><Show when={auth.user()?.role === "admin"}>
            <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreating(true)}>
              <IconPlus class="h-4 w-4" />
              {t("roster.addStudent")}
            </Button>
          </Show></>}
                columns={columns()}
                data={rows()}
            tableClass="min-w-xl"
                empty={t("form.noStudents")}
                filterPlaceholder={t("roster.searchStudents")}
                filterHint={t("search.hint.students")}
                searchPredicate={(row, query) =>
                  matchesSearch(query, row.person.username, row.person.display_name)
                }
                filters={
                  <>
                    <DropdownSelect
                      labelPrefix={t("roster.class")}
                      value={classFilter()}
                      onChange={setClassFilter}
                      options={[{ value: "", label: t("common.all") }, ...value().classes.map((cls) => ({ value: cls.id, label: cls.name }))]}
                    />
                    <DropdownSelect
                      labelPrefix={t("academicYears.year")}
                      value={yearFilter()}
                      onChange={setYearFilter}
                      options={[{ value: "", label: t("common.all") }, ...value().years.map((year) => ({ value: year.id, label: year.name }))]}
                    />
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
      <CreateUserPanel
        open={creating()}
        onOpenChange={setCreating}
        fixedRole="student"
        onCreated={() => {
          setCreating(false);
          void refetch();
        }}
      />
    </div>
  );
}
