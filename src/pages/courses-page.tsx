import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import { getCourses, postCourse, postCourseTeacher } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { getTerms } from "@/api/terms";
import { getLimits } from "@/api/limits";
import { formatApiError, type CourseKind } from "@/api/client";
import { CourseCard } from "@/components/courses/course-card";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { courseKindLabel } from "@/lib/course-kind";
import { SidePanel } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
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
  const pageLabel = () => t("nav.classes");
  const kindLabel = () => createKind() === "study" ? t("courses.kind.study") : createKind() === "club" ? t("courses.kind.club") : t("courses.kind.course");
  const kindInSentence = () =>
    kindLabelSingular().toLocaleLowerCase(prefs.locale() === "tr" ? "tr-TR" : "en-US");
  const kindLabelSingular = () => createKind() === "study" ? t("courses.kind.studySingular") : createKind() === "club" ? t("courses.kind.clubSingular") : t("courses.kind.courseSingular");
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const [showForm, setShowForm] = createSignal(routeSearch().action === "new");
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [capacity, setCapacity] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
  const [termFilter, setTermFilter] = createSignal("all");
  const [page, setPage] = createSignal(0);
  const [search, setSearch] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  createEffect(() => {
    routeSearch().action === "new" && setShowForm(true);
  });
  createEffect(() => {
    setPageKind(routeSearch().kind);
  });
  createEffect(() => {
    pageKind(); termFilter(); search(); setPage(0);
  });

  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [limits, { refetch: refetchLimits }] = createResource(() => canCreate() ? getLimits() : null);
  const [list, { refetch }] = createResource(
    () => auth.user()?.role ?? null,
    async (role) => role === "student" ? getMyCourses() : getCourses(),
  );
  const listData = () => list.latest ?? list();
  const termName = (id: string | null) => terms.latest?.find((term) => term.id === id)?.name ?? (id || t("terms.unassigned"));
  const filteredCourses = createMemo(() => {
    const query = search().trim().toLocaleLowerCase();
    return (listData()?.items ?? []).filter((course) => {
      if (pageKind() && course.kind !== pageKind()) return false;
      if (termFilter() === "unassigned" && course.term) return false;
      if (termFilter() !== "all" && termFilter() !== "unassigned" && course.term !== termFilter()) return false;
      if (!query) return true;
      return [
        course.title,
        course.description,
        personLabel(course.creator),
        ...(course.teachers ?? []).map(personLabel),
        termName(course.term),
      ].join(" ").toLocaleLowerCase().includes(query);
    });
  });
  const totalPages = createMemo(() => Math.max(1, Math.ceil(filteredCourses().length / PAGE_SIZE)));
  const visibleCourses = createMemo(() => filteredCourses().slice(page() * PAGE_SIZE, (page() + 1) * PAGE_SIZE));

  const createCourse = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const course = await postCourse({
        title: title().trim(),
        description: description().trim() || undefined,
        kind: createKind(),
        term_id: termId() || null,
        capacity: capacity().trim() ? Number(capacity()) : null,
      });
      if (teacherId() && hasMinRole(auth.user()?.role, "manager")) await postCourseTeacher(course.id, teacherId());
      setTitle(""); setDescription(""); setTermId(""); setCapacity(""); setTeacherId(""); setShowForm(false);
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
      <SidePanel open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("common.createItem", { item: kindInSentence() })} description={t("courses.subtitle", { item: kindLabel() })}>
        <form class="space-y-4" onSubmit={createCourse}>
          <Show when={limits.error}><ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} /></Show>
          <div class="flex items-center justify-between rounded-xl border border-border-line bg-surface-tint px-3 py-2 text-xs text-text-subtle">
            <span>{t("exams.kind")}</span>
            <span class="font-medium text-text-default">{kindLabelSingular()}</span>
          </div>
          <div class="space-y-3">
            <div class="space-y-1.5"><Label for="course-title">{t("form.title")}<span class="ml-0.5 text-destructive">*</span></Label><Input id="course-title" required maxlength={limits.latest?.course.max_title_len} value={title()} onInput={(e) => setTitle(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="course-description">{t("form.description")}</Label><Textarea id="course-description" maxlength={limits.latest?.course.max_description_len} rows={3} value={description()} onInput={(e) => setDescription(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="course-term">{t("terms.term")}</Label><Select id="course-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}><option value="">{t("terms.unassigned")}</option><For each={terms.latest ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For></Select></div>
            <div class="space-y-1.5"><Label for="course-capacity">{t("courses.capacity")}</Label><Input id="course-capacity" type="number" min={1} value={capacity()} onInput={(e) => setCapacity(e.currentTarget.value)} /></div>
            <Show when={hasMinRole(auth.user()?.role, "manager")}><UserSearchSelect id="course-teacher" role="teacher" value={teacherId()} onChange={setTeacherId} placeholder={t("courses.assignTeacher")} label={t("courses.teachers")} /></Show>
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border-hairline pb-5">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-text-strong">{pageLabel()}</h1>
          <p class="text-sm text-text-subtle">{t("courses.pageSubtitle")}</p>
        </div>
        <Show when={canCreate()}>
          <Button size="sm" class="min-w-30 rounded-lg" onClick={() => setShowForm(true)}>
            <IconPlus class="h-4 w-4" />
            {t("common.createItem", { item: kindInSentence() })}
          </Button>
        </Show>
      </header>

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>

      <Tabs
        value={pageKind() ?? "all"}
        onChange={(value) => {
          const kind = value === "course" || value === "study" || value === "club" ? value : undefined;
          setPageKind(kind);
          void navigate({
            to: "/courses",
            search: { action: undefined, kind },
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
          <section class="rounded-xl border border-border-line bg-surface-base p-3" aria-label={t("common.search")}>
            <DataToolbar
              inline
              searchValue={search()}
              searchPlaceholder={t("common.searchPlaceholder")}
              onSearchInput={setSearch}
              filters={
                <Select wrapperClass="w-40 shrink-0 sm:w-52" class="h-8 rounded-lg" aria-label={t("terms.term")} value={termFilter()} onChange={(e) => setTermFilter(e.currentTarget.value)}>
                  <option value="all">{t("common.all")}</option>
                  <option value="unassigned">{t("terms.unassigned")}</option>
                  <For each={terms.latest ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
                </Select>
              }
            />
          </section>

          <Suspense fallback={<PageSpinner />}>
            <Show
              when={!list.error}
              fallback={<ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />}
            >
              <Show
                when={filteredCourses().length > 0}
                fallback={<EmptyState kind="courses" title={t("courses.empty", { item: kindLabel() })} />}
              >
                <div class={list.loading ? "grid grid-cols-1 gap-3 opacity-60 transition-opacity sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3"}>
                  <For each={visibleCourses()}>
                    {(course) => (
                      <CourseCard
                        course={course}
                        term={termName(course.term)}
                        enrolled={auth.user()?.role === "student"}
                        showTeacherActions={hasMinRole(auth.user()?.role, "teacher")}
                        labels={{
                          capacity: t("courses.capacity"),
                          unlimited: t("courses.unlimited"),
                          enrolled: t("courses.enrolled"),
                          kind: courseKindLabel(course.kind, t),
                          weeklyHours: t("courses.weeklyHours"),
                          competency: t("courses.competency"),
                          attendance: t("courses.attendanceRate"),
                          progress: t("courses.progress"),
                          takeAttendance: t("courses.takeAttendance"),
                          analysis: t("courses.analysis"),
                        }}
                      />
                    )}
                  </For>
                </div>
                <PaginationControls page={page()} totalPages={totalPages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
