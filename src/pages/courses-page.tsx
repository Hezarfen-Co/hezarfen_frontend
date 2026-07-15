import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { getTerms } from "@/api/getTerms";
import { getUsers } from "@/api/getUsers";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableEmpty, DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
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
  const t = useT();
  const [courses, { refetch }] = createResource(
    () => (auth.user()?.role && auth.user()?.role !== "student" ? true : null),
    async (enabled) => (enabled ? getCourses() : []),
  );
  const [terms] = createResource(() => getTerms());
  const [users] = createResource(
    () => (hasMinRole(auth.user()?.role, "manager") ? true : null),
    async (enabled) => (enabled ? getUsers().catch(() => []) : []),
  );
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? getMyCourses() : []),
  );
  const enrolled = () => new Set((mine() ?? []).map((c) => c.id));
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [page, setPage] = createSignal(0);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const courseList = createMemo(() => (isStudent() ? mine() : courses()) ?? []);
  const termName = (termId: string | null | undefined) => terms()?.find((term) => term.id === termId)?.name ?? t("terms.unassigned");
  const creatorName = (creatorId: string) => {
    if (creatorId === auth.user()?.id) return auth.user()?.username ?? creatorId;
    return users()?.find((user) => user.id === creatorId)?.username ?? creatorId;
  };
  const filteredCourses = createMemo(() => {
    const needle = query().trim().toLocaleLowerCase();
    if (!needle) return courseList();
    return courseList().filter((course) =>
      [course.title, course.description, course.creator, creatorName(course.creator), termName(course.term_id)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
    );
  });
  const totalPages = createMemo(() => Math.max(1, Math.ceil(filteredCourses().length / COURSE_PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const pageItems = createMemo(() => {
    const start = safePage() * COURSE_PAGE_SIZE;
    return filteredCourses().slice(start, start + COURSE_PAGE_SIZE);
  });

  const onCreate = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await postCourse({
        title: title().trim(),
        description: description().trim() || undefined,
        term_id: termId() || null,
      });
      setTitle("");
      setDescription("");
      setTermId("");
      setShowForm(false);
      await refetch();
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
              <Button type="button" size="sm" class="rounded-sm" onClick={() => setShowForm(true)}>
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
            <Input
              id="course-title"
              required
              maxlength={200}
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
            />
          </div>
          <div class="space-y-1.5">
            <Label for="course-desc">{t("form.description")}</Label>
            <Textarea
              id="course-desc"
              maxlength={2000}
              rows={3}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
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
            <Badge variant="outline" class="mono h-9 rounded-sm px-3 uppercase tracking-[0.08em]">
              {isStudent() ? t("courses.enrolled") : t("common.all")}
            </Badge>
          }
        />

      <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
        <Show when={courses.error}>
          <Alert variant="destructive">{formatApiError(courses.error)}</Alert>
        </Show>
        <Show
          when={filteredCourses().length > 0}
          fallback={<DataTableEmpty>{t("courses.empty")}</DataTableEmpty>}
        >
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("courses.title")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{filteredCourses().length} / {courseList().length} {t("nav.courses")}</p>
              </div>
            </div>
            <DataTableFrame>
              <Table class="data-table table-fixed min-w-[56rem]">
                <colgroup>
                  <col class="w-[28%]" />
                  <col class="w-[30%]" />
                  <col class="w-[14rem]" />
                  <col class="w-[11rem]" />
                  <col class="w-[3.5rem]" />
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
                            <Show when={enrolled().has(course.id)}>
                              <Badge variant="secondary" class="rounded-sm">{t("courses.enrolled")}</Badge>
                            </Show>
                          </div>
                        </TableCell>
                        <TableCell class="truncate text-muted-foreground">{course.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" class="mono max-w-full rounded-sm text-[11px]">
                            <span class="truncate">{termName(course.term_id)}</span>
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
            <Show when={filteredCourses().length > COURSE_PAGE_SIZE}>
              <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
            </Show>
          </div>
        </Show>
      </Suspense>
      </section>
    </div>
  );
}
