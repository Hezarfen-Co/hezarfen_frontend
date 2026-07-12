import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [mine] = createResource(() => getMyCourses());
  const enrolled = () => new Set((mine() ?? []).map((c) => c.id));
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const courseList = createMemo(() => courses() ?? []);
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
      });
      setTitle("");
      setDescription("");
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
      <PageHeader
        accent="violet"
        eyebrow={t("nav.courses")}
        title={t("courses.title")}
        description={t("courses.subtitle")}
        actions={
          canCreate() ? (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm() ? t("common.cancel") : t("courses.create")}
            </Button>
          ) : undefined
        }
      />

      <Show when={canCreate() && showForm()}>
        <form class="surface-card max-w-xl space-y-3 p-5" onSubmit={onCreate}>
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
            <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <For each={pageItems()}>
                {(course) => (
                  <li>
                    <Link to="/courses/$id" params={{ id: course.id }} class="group block h-full">
                      <article class="surface-card flex h-full min-h-44 flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-sm">
                        <div class="border-b border-border/50 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-4">
                          <div class="flex items-start justify-between gap-2">
                            <h3 class="line-clamp-2 font-display text-lg font-semibold leading-snug group-hover:text-primary">
                              {course.title}
                            </h3>
                            <Show when={enrolled().has(course.id)}>
                              <Badge variant="secondary" class="shrink-0 rounded-sm">{t("courses.enrolled")}</Badge>
                            </Show>
                          </div>
                        </div>
                        <div class="flex flex-1 flex-col p-4">
                          <p class="line-clamp-3 flex-1 text-sm text-muted-foreground">
                            {course.description || "—"}
                          </p>
                          <p class="mt-4 truncate text-xs text-muted-foreground">
                            {t("common.creator")}: <span class="font-mono text-foreground">{course.creator}</span>
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
