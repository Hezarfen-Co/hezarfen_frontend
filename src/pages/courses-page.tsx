import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getMyCourses } from "@/api/getMyCourses";
import { postCourse } from "@/api/postCourse";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

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
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

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
        <Show
          when={(courses() ?? []).length > 0}
          fallback={
            <div class="rounded-md border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
              {t("courses.empty")}
            </div>
          }
        >
          <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <For each={courses() ?? []}>
              {(course) => (
                <li>
                  <Link to="/courses/$id" params={{ id: course.id }} class="group block h-full">
                    <article class="surface-card flex h-full flex-col p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30">
                      <div class="mb-2 flex items-start justify-between gap-2">
                        <h3 class="font-display text-lg font-semibold group-hover:text-primary">
                          {course.title}
                        </h3>
                        <Show when={enrolled().has(course.id)}>
                          <Badge variant="secondary">{t("courses.enrolled")}</Badge>
                        </Show>
                      </div>
                      <p class="line-clamp-3 flex-1 text-sm text-muted-foreground">
                        {course.description || "—"}
                      </p>
                      <p class="mt-3 text-xs text-muted-foreground">
                        {t("common.creator")}:{" "}
                        <span class="font-mono text-foreground">{course.creator}</span>
                      </p>
                    </article>
                  </Link>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Suspense>
    </div>
  );
}
