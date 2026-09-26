import { Show, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { createInfiniteList } from "@/lib/infinite-list";
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
import { createDebouncedSignal } from "@/lib/create-debounced-signal";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { createUrlEnum, readString } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  // URL parameters restore the kind, search and taught filter on reload.
  const [taughtFilter, setTaughtFilter] = createUrlEnum("taught", ["all", "taught", "untaught"] as const, "all");
  const taughtParam = () => (taughtFilter() === "taught" ? true : taughtFilter() === "untaught" ? false : undefined);
  const [search, setSearch, debouncedSearch] = createDebouncedSignal(readString(routeSearch().q));
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
  // Scoped server-side: a student reads only the courses they take. Kind,
  // search and the taught filter are all applied by the backend (checked
  // live on 2026-09-26), so the catalog loads a page at a time as the reader
  // scrolls and any filter change starts again from the top.
  const list = createInfiniteList(
    () => auth.user()
      ? { role: auth.user()!.role, kind: pageKind(), q: debouncedSearch().trim(), taught: taughtParam() }
      : null,
    (filters, paging) =>
      getCourses({
        ...paging,
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.taught != null ? { taught: filters.taught } : {}),
      }),
    { equals: (a, b) => a.role === b.role && a.kind === b.kind && a.q === b.q && a.taught === b.taught, restoreKey: "courses" },
  );
  // Edits and deletes re-read the loaded rows in place; the retry after an
  // error starts over.
  const refetch = () => list.refresh();
  const openCourse = (course: Course) => void navigate({ to: "/courses/$id", params: { id: course.id } });
  // Catalog rights, as on the detail page: the creator or a manager+.
  const canManageCatalog = (course: Course) => {
    const u = auth.user();
    return !!u && (course.creator?.id === u.id || hasMinRole(u.role, "manager"));
  };
  const [editTarget, setEditTarget] = createSignal<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Course | null>(null);
  const [rowError, setRowError] = createSignal("");
  const refreshList = async () => refetch();
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
          <Show when={list.error()}>
            {(err) => <ErrorAlert message={formatApiError(err())} onRetry={list.reload} />}
          </Show>
          <Show when={!list.initialLoading()} fallback={<DataTableSkeleton columns={5} rows={8} />}>
            <DataTable
              columns={columns()}
              data={list.items()}
              tableClass="table-fixed min-w-[44rem]"
              filterPlaceholder={t("common.searchPlaceholder")}
              filterHint={t("search.hint.courses")}
              searchValue={search()}
              onSearchInput={setSearch}
              infinite={{ hasMore: list.hasMore(), loading: list.loading(), total: list.total(), onLoadMore: list.loadMore }}
              filtersActive={taughtFilter() !== "all"}
              onClearFilters={() => {
                setTaughtFilter("all");
              }}
              empty={t("courses.empty", { item: kindInSentence() })}
              onRowClick={openCourse}
              storageKey="courses"
              filters={
                <DropdownSelect
                  labelPrefix={t("courses.sectionsFilter")}
                  value={taughtFilter()}
                  onChange={(value) => {
                    setTaughtFilter(value === "taught" || value === "untaught" ? value : "all");
                  }}
                  options={[
                    { value: "all", label: t("common.all") },
                    { value: "taught", label: t("courses.withSections") },
                    { value: "untaught", label: t("courses.withoutSections") },
                  ]}
                />
              }
              actions={
                <Show when={canCreate()}>
                  <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("common.createItem", { item: kindInSentence() })}
                  </Button>
                </Show>
              }
            />
          </Show>
        </TabsContent>
      </Tabs>
    </div>
  );
}
