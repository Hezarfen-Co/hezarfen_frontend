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
import { loadInstanceLabel } from "@/lib/instance-labels";
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
  // "<ders> — <şube>": the same ders runs in several şubeler, and their
  // homework shares titles, so the header names the şube too.
  const [sectionLabel] = createResource(
    () => homework()?.class_course ?? null,
    async (instanceId) => (await loadInstanceLabel(instanceId, auth.user()?.role))?.label ?? null,
  );
  const [subject] = createResource(() => homework()?.subject ?? null, async (subjectId) => subjectId ? getSubjectById(subjectId) : null);
  // A subject named exactly like its course ("Matematik / Matematik") adds
  // nothing next to the course tile, so that tile is left out.
  const showSubject = () => {
    const name = subject()?.name?.trim();
    return !!name && name.toLocaleLowerCase() !== course()?.title?.trim().toLocaleLowerCase();
  };
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
            <div class="mx-auto w-full max-w-[1100px] space-y-5">
              <section class="data-shell space-y-2 p-4 sm:p-5">
                <Breadcrumbs items={[{ label: t("homework.title"), to: "/homework" }, { label: item().title }]} />
                <PageHeader title={item().title} description={item().description || undefined} />
              </section>
              <section class={`data-shell grid gap-3 p-4 text-sm sm:grid-cols-2 sm:p-5 ${showSubject() ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                <div class="rounded-xl border border-border-hairline bg-surface-tint px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("nav.courses")}</p>
                  <p class="mt-1 font-medium text-text-default">{sectionLabel.latest ?? course()?.title ?? "—"}</p>
                </div>
                <Show when={showSubject()}>
                  <div class="rounded-xl border border-border-hairline bg-surface-tint px-4 py-4">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("subjects.subject")}</p>
                    <p class="mt-1 font-medium text-text-default">{subject()?.name}</p>
                  </div>
                </Show>
                <div class="rounded-xl border border-border-hairline bg-surface-tint px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("homework.dueAt")}</p>
                  <p class="mt-1 font-medium text-text-default">{formatDateTime(item().due_at, locale())}</p>
                </div>
                <div class="rounded-xl border border-border-hairline bg-surface-tint px-4 py-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-text-subtle">{t("homework.assigned")}</p>
                  <Badge variant="outline" class="mt-2 rounded-full">
                    {item().assigned?.length ? t("common.countItem", { count: item().assigned!.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse")}
                  </Badge>
                </div>
              </section>
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
