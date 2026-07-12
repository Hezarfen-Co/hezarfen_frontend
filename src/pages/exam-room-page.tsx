import { Link, useParams } from "@tanstack/solid-router";
import { Show, Suspense, createResource } from "solid-js";
import { getExamById } from "@/api/getExamById";
import { getMyCourses } from "@/api/getMyCourses";
import { ApiError } from "@/api/client";
import { ExamRoomWS } from "@/components/exams/exam-room-ws";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ExamRoomPage() {
  return (
    <RouteGuard>
      <ExamRoomContent />
    </RouteGuard>
  );
}

function ExamRoomContent() {
  const params = useParams({ from: "/exam-room/$id" });
  const auth = useAuth();
  const t = useT();
  const id = () => params().id;
  const [exam] = createResource(id, (examId) => getExamById(examId));
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? getMyCourses() : []),
  );
  const canViewExam = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    if (u.role !== "student") return true;
    return (mine() ?? []).some((course) => course.id === e.course);
  };
  const accessReady = () => auth.user()?.role !== "student" || mine() !== undefined;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()}
        fallback={
          <Show when={exam.error}>
            <Alert variant="destructive">
              {exam.error instanceof ApiError ? exam.error.message : t("common.notFound")}
            </Alert>
          </Show>
        }
      >
        {(ex) => (
          <Show when={accessReady()} fallback={<PageSpinner />}>
            <Show when={canViewExam()} fallback={<Alert variant="destructive">{t("common.notFound")}</Alert>}>
          <div class="space-y-6">
            <PageHeader
              compact
              accent="rose"
              eyebrow={t("attempt.title")}
              title={ex().title}
              description={ex().description || undefined}
              actions={
                <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1 shadow-sm sm:w-auto">
                  <Link to="/exams/$id" params={{ id: id() }}>
                    <Button variant="ghost" size="sm" class="w-full rounded-md sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                </div>
              }
            />
            <ExamRoomWS exam={ex()} />
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
