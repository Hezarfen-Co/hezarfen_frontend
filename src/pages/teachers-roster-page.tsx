import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { matchesSearch } from "@/lib/search-text";
import { getUserSearch } from "@/api/users";
import { formatApiError, type PersonRef } from "@/api/client";
import { formatInstanceLabel, loadSchoolSections, classList } from "@/lib/instance-labels";
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
  homeroom: string[] | null;
  /** The sections they teach, as "<ders> — <şube>". */
  sections: string[] | null;
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

  const [data, { refetch }] = createResource(() => getUserSearch("", undefined, "teacher"));
  const [homeroomNames] = createResource(() => data.latest?.items.length ? true : null, async () => {
    const classes = await classList();
    const push = (map: Map<string, string[]>, id: string, value: string) => map.set(id, [...(map.get(id) ?? []), value]);
    const byName = (a: string, b: string) => a.localeCompare(b, "tr", { numeric: true });
    const homeroom = new Map<string, string[]>();
    for (const cls of classes) if (cls.teacher) push(homeroom, cls.teacher.id, cls.name);
    return new Map([...homeroom].map(([id, names]) => [id, names.sort(byName)]));
  });
  const [sectionNames] = createResource(() => data.latest?.items.length ? true : null, async () => {
    const push = (map: Map<string, string[]>, id: string, value: string) => map.set(id, [...(map.get(id) ?? []), value]);
    const byName = (a: string, b: string) => a.localeCompare(b, "tr", { numeric: true });
    const perClass = await loadSchoolSections();
    const sections = new Map<string, string[]>();
    for (const { klass, sections: instances } of perClass) {
      for (const instance of instances) {
        const label = formatInstanceLabel(instance.title?.trim() || null, klass.name);
        for (const teacher of instance.teachers) push(sections, teacher.id, label);
      }
    }
    return new Map([...sections].map(([id, names]) => [id, [...new Set(names)].sort(byName)]));
  });
  const mergedRows = createMemo(() => (data.latest?.items ?? []).map<TeacherRow>((person) => ({
    person,
    homeroom: homeroomNames.latest ? homeroomNames.latest.get(person.id) ?? [] : null,
    sections: sectionNames.latest ? sectionNames.latest.get(person.id) ?? [] : null,
  })));

  const open = (row: TeacherRow) => void navigate({ to: "/profile/$userId", params: { userId: row.person.id } });

  const columns = createMemo<ColumnDef<TeacherRow>[]>(() => [
    { id: "teacher", size: 220, header: t("roster.teacher"), cell: (cell) => <RosterPersonCell person={cell.row.original.person} /> },
    {
      id: "sections",
      size: 260,
      // Empty lists read as "" so DataTable draws its one empty-cell dash,
      // the same one the homeroom column gets.
      accessorFn: (row) => row.sections?.join(", ") ?? "…",
      header: t("roster.taughtSections"),
      meta: { cellClass: "max-w-0" },
      cell: (cell) => {
        const list = cell.row.original.sections;
        return <Show when={list} fallback={<span class="inline-block h-4 w-20 animate-pulse rounded bg-muted" aria-label={t("common.loading")} />}>
          {(names) => <span class="block truncate text-sm" title={names().join("\n")}>{names().join(", ")}</span>}
        </Show>;
      },
    },
    {
      id: "homeroom",
      size: 130,
      accessorFn: (row) => row.homeroom?.join(", ") ?? "…",
      header: t("roster.homeroomOf"),
      meta: { cellClass: "max-w-0" },
      cell: (cell) => <Show when={cell.row.original.homeroom} fallback={<span class="inline-block h-4 w-16 animate-pulse rounded bg-muted" aria-label={t("common.loading")} />}>
        {(names) => <span class="block truncate text-sm" title={names().join(", ")}>{names().join(", ")}</span>}
      </Show>,
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
                data={mergedRows()}
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
