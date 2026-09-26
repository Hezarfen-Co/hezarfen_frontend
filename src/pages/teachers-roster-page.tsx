import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { matchesSearch } from "@/lib/search-text";
import { getClassInstances, getClasses } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getUserSearch } from "@/api/users";
import { formatApiError, type Course, type PersonRef } from "@/api/client";
import { formatInstanceLabel } from "@/lib/instance-labels";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { RouteGuard } from "@/components/layout/route-guard";
import { CreateUserPanel } from "@/components/users/create-user-panel";
import { RosterPersonCell } from "@/components/users/roster-person-cell";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { useT } from "@/stores/preferences-context";
import { useAuth } from "@/stores/auth-context";

const ROSTER_PAGE_SIZE = 10;

type TeacherRow = {
  person: PersonRef;
  /** Classes this teacher is the homeroom teacher (sınıf öğretmeni) of. */
  homeroom: string[];
  /** The sections they teach, as "<ders> — <şube>". */
  sections: string[];
};

export default function TeachersRosterPage() {
  return (
    <RouteGuard minRole="manager">
      <TeachersRosterContent />
    </RouteGuard>
  );
}

// ADM-08. Two real columns: the classes a teacher is homeroom teacher of
// (ClassGroup.teacher) and the sections they teach (Instance.teachers, read
// one `/classes/{id}/instances` page per class — bounded by the class count,
// not the teacher count). Branch, weekly load, AI acceptance and employment
// status have no field anywhere, so those design columns are left out.
function TeachersRosterContent() {
  const t = useT();
  const auth = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);

  const [data, { refetch }] = createResource(async () => {
    const [teachers, classes, courses] = await Promise.all([
      getUserSearch("", undefined, "teacher"),
      getClasses(),
      getCourses().catch(() => ({ items: [] as Course[] })),
    ]);
    const push = (map: Map<string, string[]>, id: string, value: string) => map.set(id, [...(map.get(id) ?? []), value]);
    const byName = (a: string, b: string) => a.localeCompare(b, "tr", { numeric: true });
    const homeroom = new Map<string, string[]>();
    for (const cls of classes.items) if (cls.teacher) push(homeroom, cls.teacher.id, cls.name);
    const titles = new Map(courses.items.map((course) => [course.id, course.title]));
    const perClass = await mapConcurrent(classes.items, FAN_OUT_LIMIT, async (cls) => ({
      cls,
      // One unreadable class must not empty the whole column.
      instances: await getClassInstances(cls.id).then((page) => page.items, () => []),
    }));
    const sections = new Map<string, string[]>();
    for (const { cls, instances } of perClass) {
      for (const instance of instances) {
        const label = formatInstanceLabel(titles.get(instance.course) ?? null, cls.name);
        for (const teacher of instance.teachers) push(sections, teacher.id, label);
      }
    }
    return teachers.items.map<TeacherRow>((person) => ({
      person,
      homeroom: (homeroom.get(person.id) ?? []).sort(byName),
      sections: [...new Set(sections.get(person.id) ?? [])].sort(byName),
    }));
  });

  const open = (row: TeacherRow) => void navigate({ to: "/profile/$userId", params: { userId: row.person.id } });

  const columns = createMemo<ColumnDef<TeacherRow>[]>(() => [
    { id: "teacher", size: 220, header: t("roster.teacher"), cell: (cell) => <RosterPersonCell person={cell.row.original.person} /> },
    {
      id: "sections",
      size: 260,
      accessorFn: (row) => row.sections.length,
      header: t("roster.taughtSections"),
      meta: { cellClass: "max-w-0" },
      cell: (cell) => {
        const list = cell.row.original.sections;
        return list.length ? <span class="block truncate text-sm" title={list.join("\n")}>{list.join(", ")}</span> : "—";
      },
    },
    {
      id: "homeroom",
      size: 130,
      accessorFn: (row) => row.homeroom.join(", "),
      header: t("roster.homeroomOf"),
      meta: { cellClass: "max-w-0" },
      cell: (cell) => <span class="block truncate text-sm" title={cell.row.original.homeroom.join(", ") || undefined}>{cell.row.original.homeroom.join(", ") || "—"}</span>,
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
        <Suspense fallback={<DataTableSkeleton columns={4} rows={8} />}>
          <Show when={data.error}>
            <ErrorAlert message={formatApiError(data.error)} onRetry={() => void refetch()} />
          </Show>
          <Show when={!data.error && data()}>
            {(rows) => (
              <DataTable
                urlState
                surfaceSections
                title={t("nav.teachersRoster")}
                description={t("roster.teachersSubtitle")}
                actions={<><Show when={auth.user()?.role === "admin"}>
            <Button size="sm" class="min-w-[7.5rem]" onClick={() => setCreating(true)}>
              <IconPlus class="h-4 w-4" />
              {t("roster.addTeacher")}
            </Button>
          </Show></>}
                columns={columns()}
                data={rows()}
                tableClass="min-w-2xl"
                empty={t("roster.noTeachers")}
                filterPlaceholder={t("roster.searchTeachers")}
                filterHint={t("search.hint.teachers")}
                searchPredicate={(row, query) =>
                  matchesSearch(query, row.person.username, row.person.display_name)
                }
                enablePagination
                pageSize={ROSTER_PAGE_SIZE}
                storageKey="teachers-roster"
                onRowClick={open}
              />
            )}
          </Show>
        </Suspense>
      </section>
      <CreateUserPanel
        open={creating()}
        onOpenChange={setCreating}
        fixedRole="teacher"
        onCreated={() => {
          setCreating(false);
          void refetch();
        }}
      />
    </div>
  );
}
