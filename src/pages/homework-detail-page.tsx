import { useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createMemo } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseById } from "@/api/courses";
import { getInstanceById } from "@/api/instances";
import { formatApiError } from "@/api/client";
import { getHomeworkById } from "@/api/homework";
import { getSubjectById } from "@/api/subjects";
import { HomeworkSubmissionPanel } from "@/components/homework/homework-submission-panel";
import { HomeworkSubmissionsPanel } from "@/components/homework/homework-submissions-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/page-spinner";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function HomeworkDetailPage() {
  const location = useLocation();
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const id = createMemo((prev: string) => {
    const match = /^\/homework\/([^/]+)$/.exec(location().pathname);
    return match ? decodeURIComponent(match[1]) : prev;
  }, "");
  const [homework] = createResource(id, (homeworkId) => getHomeworkById(homeworkId));
  // Homework hangs off the instance; the catalog course behind it is one hop
  // further, and it is what names the work on screen.
  const [instance] = createResource(() => homework()?.class_course ?? null, (instanceId) => getInstanceById(instanceId));
  const [course] = createResource(() => instance()?.course ?? null, (courseId) => getCourseById(courseId));
  const [subject] = createResource(() => homework()?.subject ?? null, async (subjectId) => subjectId ? getSubjectById(subjectId) : null);
  const canManage = () => {
    const user = auth.user();
    const item = homework();
    const currentCourse = course();
    if (!user || !item) return false;
    return item.created_by === user.id || currentCourse?.creator.id === user.id || (instance()?.teachers ?? []).some((teacher) => teacher.id === user.id) || hasMinRole(user.role, "manager");
  };

  return (
    <RouteGuard>
      <Suspense fallback={<PageSpinner />}>
        <Show
          when={homework()?.id === id() ? homework() : undefined}
          fallback={<Show when={homework.error} fallback={<PageSpinner />}><Alert variant="destructive">{formatApiError(homework.error, locale())}</Alert></Show>}
        >
          {(item) => (
            <div class="space-y-6">
              <div class="space-y-2">
                <Breadcrumbs items={[{ label: t("homework.title"), to: "/homework" }, { label: item().title }]} />
                <PageHeader title={item().title} description={item().description || undefined} />
              </div>
              <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-xl border border-border-line bg-surface-base px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("nav.courses")}</p>
                  <p class="mt-1 font-medium text-text-default">{course()?.title ?? item().class_course}</p>
                </div>
                <div class="rounded-xl border border-border-line bg-surface-base px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("subjects.subject")}</p>
                  <p class="mt-1 font-medium text-text-default">{subject()?.name ?? item().subject}</p>
                </div>
                <div class="rounded-xl border border-border-line bg-surface-base px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("homework.dueAt")}</p>
                  <p class="mono mt-1 font-medium tabular-nums text-text-default">{formatDateTime(item().due_at, locale())}</p>
                </div>
                <div class="rounded-xl border border-border-line bg-surface-base px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("homework.assigned")}</p>
                  <Badge variant="outline" class="mt-2 rounded-full">
                    {item().assigned?.length ? t("common.countItem", { count: item().assigned!.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse")}
                  </Badge>
                </div>
              </div>
              <Show when={auth.user()?.role === "student"}>
                <HomeworkSubmissionPanel homeworkId={id()} />
              </Show>
              <Show when={canManage()}>
                <HomeworkSubmissionsPanel homeworkId={id()} instanceId={item().class_course} />
              </Show>
            </div>
          )}
        </Show>
      </Suspense>
    </RouteGuard>
  );
}
