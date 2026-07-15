import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { getTerms } from "@/api/getTerms";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const COURSE_PAGE_SIZE = 9;

export default function CoursesPage() {
  return (
    <RouteGuard>
      <CoursesContent />
    </RouteGuard>
  );
}

function CoursesContent() {
  const auth = useAuth();
  const t = useT();
  const [courses, { refetch }] = createResource(() => getCourses());
  const [terms] = createResource(() => getTerms());
  const [mine] = createResource(() => getMyCourses());
  const enrolled = () => new Set((mine() ?? []).map((c) => c.id));
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const courseList = createMemo(() => (isStudent() ? mine() : courses()) ?? []);
  const totalPages = createMemo(() => Math.max(1, Math.ceil(courseList().length / COURSE_PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const pageItems = createMemo(() => {
    const start = safePage() * COURSE_PAGE_SIZE;
    return courseList().slice(start, start + COURSE_PAGE_SIZE);
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
              <Button type="button" size="sm" class="rounded-sm" onClick={() => setShowForm((v) => !v)}>
                {showForm() ? t("common.cancel") : t("courses.create")}
              </Button>
            ) : undefined
          }
        />
      </div>

      <Show when={canCreate() && showForm()}>
        <form class="data-shell max-w-xl space-y-3 p-4" onSubmit={onCreate}>
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
          <Button type="submit" disabled={pending()}>
            {t("common.create")}
          </Button>
        </form>
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={courses.error}>
          <Alert variant="destructive">{formatApiError(courses.error)}</Alert>
        </Show>
        <Show
          when={courseList().length > 0}
          fallback={
            <div class="rounded-md border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
              {t("courses.empty")}
            </div>
          }
        >
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("courses.title")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{courseList().length} {t("nav.courses")}</p>
              </div>
              <Badge variant="outline" class="mono rounded-sm uppercase tracking-[0.08em]">
                {isStudent() ? t("courses.enrolled") : t("common.all")}
              </Badge>
            </div>
            <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <For each={pageItems()}>
                {(course) => (
                  <li>
                    <Link to="/courses/$id" params={{ id: course.id }} class="group block h-full">
                      <article class="data-shell flex h-full min-h-40 flex-col overflow-hidden transition-colors group-hover:border-primary/35">
                        <div class="border-b border-border bg-muted/35 p-3">
                          <div class="flex items-start justify-between gap-2">
                            <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-primary">
                              {course.title}
                            </h3>
                            <Show when={enrolled().has(course.id)}>
                              <Badge variant="secondary" class="shrink-0 rounded-sm">{t("courses.enrolled")}</Badge>
                            </Show>
                          </div>
                        </div>
                        <div class="flex flex-1 flex-col p-3">
                          <Show when={course.term_id}>
                            {(tid) => (
                              <Badge variant="outline" class="mb-3 w-fit rounded-sm mono text-[11px]">
                                {terms()?.find((term) => term.id === tid())?.name ?? t("terms.term")}
                              </Badge>
                            )}
                          </Show>
                          <p class="line-clamp-3 flex-1 text-[13px] text-muted-foreground">
                            {course.description || "—"}
                          </p>
                          <p class="mono mt-4 truncate text-xs text-muted-foreground">
                            {t("common.creator")}: <span class="text-foreground">{course.creator}</span>
                          </p>
                        </div>
                      </article>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
            <Show when={courseList().length > COURSE_PAGE_SIZE}>
              <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
            </Show>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
