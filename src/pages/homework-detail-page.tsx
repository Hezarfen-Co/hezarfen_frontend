import { Link, useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createResource } from "solid-js";
import { getCourseById } from "@/api/courses";
import { formatApiError } from "@/api/client";
import { getHomeworkById } from "@/api/homework";
import { getSubjectById } from "@/api/subjects";
import { HomeworkSubmissionPanel } from "@/components/homework/homework-submission-panel";
import { HomeworkSubmissionsPanel } from "@/components/homework/homework-submissions-panel";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@/components/ui/icons";
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
  const [course] = createResource(() => homework()?.course ?? null, async (courseId) => courseId ? getCourseById(courseId) : null);
  const [subject] = createResource(() => homework()?.subject ?? null, async (subjectId) => subjectId ? getSubjectById(subjectId) : null);
  const canManage = () => {
    const user = auth.user();
    const item = homework();
    const currentCourse = course();
    if (!user || !item) return false;
    return item.created_by === user.id || currentCourse?.creator.id === user.id || (currentCourse?.teachers ?? []).some((teacher) => teacher.id === user.id) || hasMinRole(user.role, "manager");
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
              <PageHeader
                accent="amber"
                eyebrow={t("homework.item")}
                title={item().title}
                description={item().description || undefined}
                actions={
                  <Link to="/homework">
                    <Button type="button" variant="ghost" size="sm" class="rounded-lg">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                }
              />
              <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("nav.courses")}</p>
                  <p class="mt-1 font-medium">{course()?.title ?? item().course}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("subjects.subject")}</p>
                  <p class="mt-1 font-medium">{subject()?.name ?? item().subject}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("homework.dueAt")}</p>
                  <p class="mono mt-1 font-medium tabular-nums">{formatDateTime(item().due_at, locale())}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("homework.assigned")}</p>
                  <Badge variant="outline" class="mt-2 rounded-full">
                    {item().assigned?.length ? t("common.countItem", { count: item().assigned!.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse")}
                  </Badge>
                </div>
              </div>
              <Show when={auth.user()?.role === "student"}>
                <HomeworkSubmissionPanel homeworkId={id()} />
              </Show>
              <Show when={canManage()}>
                <HomeworkSubmissionsPanel homeworkId={id()} courseId={item().course} />
              </Show>
            </div>
          )}
        </Show>
      </Suspense>
    </RouteGuard>
  );
}
