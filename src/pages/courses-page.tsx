import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { getTerms } from "@/api/getTerms";
import { getUsers } from "@/api/getUsers";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import type { Course, CourseKind } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { createFlash } from "@/lib/flash";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const COURSE_PAGE_SIZE = 12;
const COURSE_KINDS: CourseKind[] = ["course", "study"];

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
  const t = useT();
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [kind, setKind] = createSignal<CourseKind>("course");
  const [termId, setTermId] = createSignal("");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [termFilter, setTermFilter] = createSignal("all");
  const [page, setPage] = createSignal(0);

  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const clientFilterActive = () => query().trim() !== "" || termFilter() !== "all";

  const [terms] = createResource(async () => (await getTerms()).items);
  const [users] = createResource(
    () => (hasMinRole(auth.user()?.role, "manager") ? true : null),
    async (enabled) => (enabled ? (await getUsers().catch(() => ({ items: [] as Awaited<ReturnType<typeof getUsers>>["items"] }))).items : []),
  );

  const termName = (id: string | null | undefined) => terms()?.find((term) => term.id === id)?.name ?? t("terms.unassigned");
  const courseKindLabel = (value: CourseKind | undefined) =>
    value === "study" ? t("courses.kind.study") : t("courses.kind.course");
  const creatorName = (creatorId: string) => {
    if (creatorId === auth.user()?.id) return auth.user()?.username ?? creatorId;
    return users()?.find((user) => user.id === creatorId)?.username ?? creatorId;
  };

  const filterCourses = (items: Course[]) => {
    const needle = query().trim().toLocaleLowerCase();
    const selectedTerm = termFilter();
    return items.filter((course) => {
      if (selectedTerm === "unassigned" && course.term) return false;
      if (selectedTerm !== "all" && selectedTerm !== "unassigned" && course.term !== selectedTerm) return false;
      if (!needle) return true;
      return [course.title, course.description, course.creator, creatorName(course.creator), termName(course.term), courseKindLabel(course.kind)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle);
    });
  };

  const [list, { refetch }] = createResource(
    () => {
      const role = auth.user()?.role;
      if (!role) return null;
      return [role, page(), clientFilterActive() ? "1" : "0", query(), termFilter()].join("|");
    },
    async (key) => {
      const role = key.split("|")[0];
      const fetchPage = (params?: { limit?: number; offset?: number }) =>
        role === "student" ? getMyCourses(params) : getCourses(params);
      return loadListPage({
        page: page(),
        pageSize: COURSE_PAGE_SIZE,
        clientMode: clientFilterActive(),
        fetch: fetchPage,
        filter: filterCourses,
      });
    },
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), COURSE_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  const onCreate = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await postCourse({
        title: title().trim(),
        description: description().trim() || undefined,
        kind: kind(),
        term_id: termId() || null,
      });
      setTitle("");
      setDescription("");
      setKind("course");
      setTermId("");
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
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.group.classes")}</span>
          <span>/</span>
          <span>{t("nav.courses")}</span>
        </div>
        <PageHeader
          accent="violet"
          eyebrow={t("nav.courses")}
          title={t("courses.title")}
          description={t("courses.subtitle")}
          actions={
            canCreate() ? (
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setShowForm(true)}>
                <IconPlus class="h-4 w-4" />
                {t("courses.create")}
              </Button>
            ) : undefined
          }
        />
      </div>

      <SidePanel open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("courses.create")} description={t("courses.subtitle")}>
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
            <Label for="course-kind">{t("courses.kind")}</Label>
            <Select id="course-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as CourseKind)}>
              <For each={COURSE_KINDS}>{(item) => <option value={item}>{courseKindLabel(item)}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="course-term">{t("terms.term")}</Label>
            <Select id="course-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}>
              <option value="">{t("terms.unassigned")}</option>
              <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
            </Select>
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
        <DataToolbar
          searchValue={query()}
          searchPlaceholder={t("common.searchPlaceholder")}
          onSearchInput={(value) => {
            setQuery(value);
            setPage(0);
          }}
          filters={
            <div class="flex flex-wrap items-center gap-2">
              <Select
                class="h-9 w-full rounded-sm sm:w-44"
                value={termFilter()}
                aria-label={t("terms.term")}
                onChange={(event) => {
                  setTermFilter(event.currentTarget.value);
                  setPage(0);
                }}
              >
                <option value="all">{t("common.all")}</option>
                <option value="unassigned">{t("terms.unassigned")}</option>
                <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
              </Select>
            </div>
          }
        />

        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <Show
            when={pageItems().length > 0}
            fallback={
              <EmptyState
                title={t("courses.empty")}
                action={
                  canCreate() ? (
                    <Button type="button" size="sm" class="rounded-lg" onClick={() => setShowForm(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("courses.create")}
                    </Button>
                  ) : undefined
                }
              />
            }
          >
            <div class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg font-semibold">{t("courses.listTitle")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {pageItems().length} / {total()} {t("nav.courses")}
                  </p>
                </div>
              </div>
              <DataTableFrame>
                <Table class="data-table table-fixed min-w-[44rem]">
                  <colgroup>
                    <col class="w-[28%]" />
                    <col class="w-[30%]" />
                    <col class="w-[9rem]" />
                    <col class="w-[10rem]" />
                    <col class="w-[5rem]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("courses.title")}</TableHead>
                      <TableHead>{t("form.description")}</TableHead>
                      <TableHead>{t("terms.term")}</TableHead>
                      <TableHead>{t("common.creator")}</TableHead>
                      <TableHead class="text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={pageItems()}>
                      {(course) => (
                        <TableRow>
                          <TableCell>
                            <div class="min-w-0 space-y-1">
                              <p class="truncate font-medium">{course.title}</p>
                              <Badge variant="outline" class="rounded-sm text-[11px]">
                                {courseKindLabel(course.kind)}
                              </Badge>
                              <Show when={isStudent()}>
                                <Badge variant="secondary" class="rounded-sm">{t("courses.enrolled")}</Badge>
                              </Show>
                            </div>
                          </TableCell>
                          <TableCell class="truncate text-muted-foreground">{course.description || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" class="mono max-w-full rounded-sm text-[11px]">
                              <span class="truncate">{termName(course.term)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell class="truncate text-muted-foreground">{creatorName(course.creator)}</TableCell>
                          <TableCell class="px-1 text-center">
                            <TableRowActions
                              label={t("common.actions")}
                              actions={[
                                {
                                  label: t("common.view"),
                                  icon: <IconEye class="h-4 w-4" />,
                                  onSelect: () => void navigate({ to: "/courses/$id", params: { id: course.id } }),
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </DataTableFrame>
              <Show when={total() > COURSE_PAGE_SIZE}>
                <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
              </Show>
            </div>
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
