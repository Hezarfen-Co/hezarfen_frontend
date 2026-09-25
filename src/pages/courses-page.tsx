import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteCourseById, getCourses, postCourse } from "@/api/courses";
import { getLimits } from "@/api/limits";
import { formatApiError, type Course, type CourseKind } from "@/api/client";
import { CourseEditPanel } from "@/components/courses/course-edit-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/select";
import { courseKindLabel } from "@/lib/course-kind";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { createUrlEnum } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const PAGE_SIZE = 10;

export default function CoursesPage() {
  return <RouteGuard><CoursesContent /></RouteGuard>;
}

function CoursesContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const routeSearch = useSearch({ from: "/courses" });
  const t = useT();
  const prefs = usePreferences();
  const [pageKind, setPageKind] = createSignal<CourseKind | undefined>(routeSearch().kind);
  const createKind = (): CourseKind => pageKind() ?? "course";
  const kindLabel = () => createKind() === "study" ? t("courses.kind.study") : createKind() === "club" ? t("courses.kind.club") : t("courses.kind.course");
  const kindInSentence = () =>
    kindLabelSingular().toLocaleLowerCase(prefs.locale() === "tr" ? "tr-TR" : "en-US");
  const kindLabelSingular = () => createKind() === "study" ? t("courses.kind.studySingular") : createKind() === "club" ? t("courses.kind.clubSingular") : t("courses.kind.courseSingular");
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const [showForm, setShowForm] = createSignal(routeSearch().action === "new");
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  // Catalog rows carry no term, capacity or staff any more — a şube decides
  // all three when it attaches the course. `taughtFilter` narrows by whether
  // any şube has. It rides in the URL beside the table's own search, sort and
  // page, so Back from a course and a reload land where the list was left.
  const [taughtFilter, setTaughtFilter] = createUrlEnum("taught", ["all", "taught", "untaught"] as const, "all");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  createEffect(() => {
    routeSearch().action === "new" && setShowForm(true);
  });
  createEffect(() => {
    setPageKind(routeSearch().kind);
  });

  const [limits, { refetch: refetchLimits }] = createResource(() => canCreate() ? getLimits() : null);
  const [list, { refetch }] = createResource(
    () => auth.user()?.role ?? null,
    // Scoped server-side: a student reads only the courses they take.
    () => getCourses(),
  );
  const listData = () => list.latest ?? list();
  // A memo: the table must see one array per change, not a fresh one per read.
  const filteredCourses = createMemo(() =>
    (listData()?.items ?? []).filter((course) => {
      if (pageKind() && course.kind !== pageKind()) return false;
      if (taughtFilter() === "untaught" && course.class_course_count > 0) return false;
      if (taughtFilter() === "taught" && course.class_course_count === 0) return false;
      return true;
    }),
  );
  const openCourse = (course: Course) => void navigate({ to: "/courses/$id", params: { id: course.id } });
  // Catalog rights, as on the detail page: the creator or a manager+.
  const canManageCatalog = (course: Course) => {
    const u = auth.user();
    return !!u && (course.creator?.id === u.id || hasMinRole(u.role, "manager"));
  };
  const [editTarget, setEditTarget] = createSignal<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Course | null>(null);
  const [rowError, setRowError] = createSignal("");
  const refreshList = async () => {
    try { await refetch(); } catch { /* stale rows until the next load */ }
  };
  const columns = createMemo<ColumnDef<Course>[]>(() => [
    {
      accessorKey: "title",
      header: t("form.title"),
      size: 200,
      minSize: 160,
      meta: { cellClass: "max-w-0" },
      cell: (cell) => <span class="block truncate font-medium" title={cell.row.original.title}>{cell.row.original.title}</span>,
    },
    {
      // The description is its own column (one line, "…" + hover for the
      // rest) rather than a caption under the title.
      id: "description",
      accessorFn: (row) => row.description ?? "",
      header: t("form.description"),
      size: 220,
      minSize: 160,
      enableSorting: false,
      meta: { cellClass: "max-w-0 text-text-subtle" },
      cell: (cell) => (
        <span class="block truncate" title={cell.row.original.description || undefined}>
          {cell.row.original.description || "—"}
        </span>
      ),
    },
    {
      id: "kind",
      accessorFn: (row) => courseKindLabel(row.kind, t),
      header: t("exams.kind"),
      size: 110,
      minSize: 100,
      meta: { cellClass: "whitespace-nowrap text-center" },
      cell: (cell) => (
        <Badge variant="outline" class="rounded-md text-[11px] font-medium">{courseKindLabel(cell.row.original.kind, t)}</Badge>
      ),
    },
    // A student sees only the courses they take: the "enrolled" marker is its
    // own column for them rather than a second badge in the kind cell.
    ...(auth.user()?.role === "student"
      ? [{
          id: "enrolled",
          header: t("roster.status"),
          size: 100,
          minSize: 90,
          enableSorting: false,
          meta: { cellClass: "whitespace-nowrap text-center" },
          cell: () => <Badge variant="secondary" class="rounded-md text-[11px]">{t("courses.enrolled")}</Badge>,
        } satisfies ColumnDef<Course>]
      : []),
    {
      id: "sections",
      accessorFn: (row) => row.class_course_count,
      header: t("courses.sectionsFilter"),
      size: 90,
      minSize: 80,
      meta: { cellClass: "text-center", align: "center" },
    },
    {
      id: "creator",
      accessorFn: (row) => personLabel(row.creator),
      header: t("common.creator"),
      size: 170,
      minSize: 130,
      meta: { cellClass: "max-w-0 truncate text-text-subtle" },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => openCourse(cell.row.original) },
            ...(canManageCatalog(cell.row.original)
              ? [
                  { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => setEditTarget(cell.row.original) },
                  { label: t("courses.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
                ]
              : []),
          ]}
        />
      ),
    },
  ]);

  const createCourse = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await postCourse({
        title: title().trim(),
        description: description().trim() || undefined,
        kind: createKind(),
      });
      setTitle(""); setDescription(""); setShowForm(false);
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
      <SidePanel guardUnsaved open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("common.createItem", { item: kindInSentence() })} description={t("courses.subtitle", { item: kindLabel() })}>
        <form class="space-y-4" onSubmit={createCourse}>
          <Show when={limits.error}><ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} /></Show>
          <div class="flex items-center justify-between rounded-xl border border-border-line bg-surface-tint px-3 py-2 text-xs text-text-subtle">
            <span>{t("exams.kind")}</span>
            <span class="font-medium text-text-default">{kindLabelSingular()}</span>
          </div>
          <div class="space-y-3">
            <div class="space-y-1.5"><Label for="course-title">{t("form.title")}<span class="ml-0.5 text-destructive-text">*</span></Label><Input id="course-title" required maxlength={limits.latest?.course.max_title_len} value={title()} onInput={(e) => setTitle(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="course-description">{t("form.description")}</Label><Textarea id="course-description" maxlength={limits.latest?.course.max_description_len} rows={3} value={description()} onInput={(e) => setDescription(e.currentTarget.value)} /></div>
            <p class="rounded-xl border border-border-line bg-surface-tint px-3 py-2 text-xs text-text-subtle">{t("instances.emptyHelp")}</p>
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <CourseEditPanel
        course={editTarget()}
        open={editTarget() !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSaved={async () => { setFlash(t("common.saved")); await refreshList(); }}
      />

      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("courses.delete") + `: “${deleteTarget()?.title ?? ""}”`}
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          setRowError("");
          try {
            await deleteCourseById(target.id);
            setDeleteTarget(null);
            setFlash(t("common.deleted"));
            await refreshList();
          } catch (err) {
            setDeleteTarget(null);
            setRowError(formatApiError(err));
          }
        }}
      />

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <Show when={rowError()}><Alert variant="destructive">{rowError()}</Alert></Show>

      <Tabs
        value={pageKind() ?? "all"}
        onChange={(value) => {
          const kind = value === "course" || value === "study" || value === "club" ? value : undefined;
          setPageKind(kind);
          void navigate({
            to: "/courses",
            search: (prev) => ({ q: prev.q, taught: prev.taught, sort: prev.sort, action: undefined, kind, page: undefined }),
            replace: true,
          });
        }}
      >
        <TabsList aria-label={t("nav.classes")}>
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="course">{t("courses.kind.course")}</TabsTrigger>
          <TabsTrigger value="study">{t("courses.kind.study")}</TabsTrigger>
          <TabsTrigger value="club">{t("courses.kind.club")}</TabsTrigger>
        </TabsList>

        <TabsContent value={pageKind() ?? "all"} class="mt-4 space-y-4 border-0 bg-transparent p-0 shadow-none">
          <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
            <Show when={list.error}>
              <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
            </Show>
            <DataTable
              urlState
              columns={columns()}
              data={filteredCourses()}
              tableClass="table-fixed min-w-[44rem]"
              searchPredicate={(course, query) => matchesSearch(query, course.title, course.description, personLabel(course.creator))}
              filterPlaceholder={t("common.searchPlaceholder")}
              filterHint={t("search.hint.courses")}
              enablePagination
              pageSize={PAGE_SIZE}
              storageKey="courses"
              pageResetKey={`${pageKind() ?? "all"}|${taughtFilter()}`}
              filtersActive={taughtFilter() !== "all"}
              onClearFilters={() => setTaughtFilter("all")}
              empty={t("courses.empty", { item: kindInSentence() })}
              onRowClick={openCourse}
              filters={
                <DropdownSelect
                  labelPrefix={t("courses.sectionsFilter")}
                  value={taughtFilter()}
                  onChange={(value) => setTaughtFilter(value === "taught" || value === "untaught" ? value : "all")}
                  options={[
                    { value: "all", label: t("common.all") },
                    { value: "taught", label: t("courses.withSections") },
                    { value: "untaught", label: t("courses.withoutSections") },
                  ]}
                />
              }
              actions={
                <Show when={canCreate()}>
                  <Button type="button" size="sm" class="rounded-lg" onClick={() => setShowForm(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("common.createItem", { item: kindInSentence() })}
                  </Button>
                </Show>
              }
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
