import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { getTerms } from "@/api/getTerms";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import type { Course, CourseKind } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const COURSE_PAGE_SIZE = 12;

export default function CoursesPage() {
  return (
    <RouteGuard>
      <CoursesContent />
    </RouteGuard>
  );
}

function CoursesContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [capacity, setCapacity] = createSignal("");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const [termFilter, setTermFilter] = createSignal("all");

  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";

  const [terms] = createResource(async () => (await getTerms()).items);

  const termName = (id: string | null | undefined) => terms()?.find((term) => term.id === id)?.name ?? t("terms.unassigned");
  const courseKindLabel = (value: CourseKind | undefined) =>
    value === "study" ? t("courses.kind.study") : value === "club" ? t("courses.kind.club") : t("courses.kind.course");
  const pageKind = (): CourseKind => location().pathname.startsWith("/studies") ? "study" : location().pathname.startsWith("/clubs") ? "club" : "course";
  const pageLabel = () => courseKindLabel(pageKind());
  const filterCourses = (items: Course[]) => {
    const selectedTerm = termFilter();
    return items.filter((course) => {
      if (selectedTerm === "unassigned" && course.term) return false;
      if (selectedTerm !== "all" && selectedTerm !== "unassigned" && course.term !== selectedTerm) return false;
      return course.kind === pageKind();
    });
  };
  const searchCourse = (course: Course, query: string) =>
    [course.title, course.description, personLabel(course.creator), course.creator.username, termName(course.term), courseKindLabel(course.kind)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());

  const [list, { refetch }] = createResource(
    () => auth.user()?.role ?? null,
    async (role) => (role === "student" ? (await getMyCourses()).items : (await getCourses()).items),
  );

  const rows = () => filterCourses(list() ?? []);
  const columns = createMemo<ColumnDef<Course>[]>(() => [
    {
      accessorKey: "title",
      header: pageLabel(),
      cell: (cell) => (
        <div class="min-w-0 space-y-1">
          <p class="truncate font-medium">{cell.row.original.title}</p>
          <Show when={isStudent()}>
            <Badge variant="secondary" class="rounded-sm">{t("courses.enrolled")}</Badge>
          </Show>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("form.description"),
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => cell.row.original.description || "—",
    },
    {
      id: "term",
      accessorFn: (course) => termName(course.term),
      header: t("terms.term"),
      cell: (cell) => <Badge variant="outline" class="mono max-w-full rounded-sm text-[11px]"><span class="truncate">{termName(cell.row.original.term)}</span></Badge>,
    },
    {
      id: "creator",
      accessorFn: (course) => personLabel(course.creator),
      header: t("common.creator"),
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => personLabel(cell.row.original.creator),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("common.view"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => void navigate({ to: "/courses/$id", params: { id: cell.row.original.id } }),
          }]}
        />
      ),
    },
  ]);

  const onCreate = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const cap = capacity().trim();
      await postCourse({
        title: title().trim(),
        description: description().trim() || undefined,
        kind: pageKind(),
        term_id: termId() || null,
        capacity: cap ? Number(cap) : null,
      });
      setTitle("");
      setDescription("");
      setTermId("");
      setCapacity("");
      setShowForm(false);
      await refetch();
      setFlash(t("common.created"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader
          accent="violet"
          eyebrow={t("nav.group.classes")}
          title={pageLabel()}
          description={t("courses.subtitle", { item: pageLabel() })}
          actions={
            canCreate() ? (
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setShowForm(true)}>
                <IconPlus class="h-4 w-4" />
                {t("common.createItem", { item: pageLabel() })}
              </Button>
            ) : undefined
          }
        />
      </div>

      <SidePanel open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("common.createItem", { item: pageLabel() })} description={t("courses.subtitle", { item: pageLabel() })}>
        <form class="space-y-3" onSubmit={onCreate}>
          <div class="space-y-1.5">
            <Label for="course-title">{t("form.title")}</Label>
            <Input id="course-title" required maxlength={200} value={title()} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="course-desc">{t("form.description")}</Label>
            <Textarea id="course-desc" maxlength={2000} rows={3} value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="course-term">{t("terms.term")}</Label>
            <Select id="course-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}>
              <option value="">{t("terms.unassigned")}</option>
              <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="course-capacity">{t("courses.capacity")}</Label>
            <Input id="course-capacity" type="number" min={1} value={capacity()} placeholder={t("courses.capacityOptional")} onInput={(e) => setCapacity(e.currentTarget.value)} />
          </div>
          {error() && <p class="text-sm text-destructive">{error()}</p>}
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-sm" disabled={pending()}>
              {t("common.create")}
            </Button>
            <Button type="button" variant="outline" class="rounded-sm" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <section class="data-shell space-y-4 p-4">
        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("courses.listTitle", { item: pageLabel() })}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  {t("common.countItem", { count: rows().length, item: pageLabel() })}
                </p>
              </div>
            </div>
            <DataTable
              columns={columns()}
              data={rows()}
              tableClass="table-fixed min-w-[44rem]"
              searchPredicate={searchCourse}
              enablePagination
              pageSize={COURSE_PAGE_SIZE}
              empty={t("courses.empty", { item: pageLabel() })}
              filters={
                <Select
                  class="h-9 w-full rounded-sm sm:w-44"
                  value={termFilter()}
                  aria-label={t("terms.term")}
                  onChange={(event) => setTermFilter(event.currentTarget.value)}
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="unassigned">{t("terms.unassigned")}</option>
                  <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
                </Select>
              }
            />
          </div>
        </Suspense>
      </section>
    </div>
  );
}
