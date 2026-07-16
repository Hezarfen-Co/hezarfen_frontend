import { Link, useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createResource } from "solid-js";
import { getExamById } from "@/api/getExamById";
import { getMyCourses } from "@/api/getMyCourses";
import { formatApiError } from "@/api/client";
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
  const location = useLocation();
  const auth = useAuth();
  const t = useT();
  const id = createMemo(() => decodeURIComponent(location().pathname.split("/").pop() ?? ""));
  const [exam] = createResource(id, (examId) => getExamById(examId));
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses()).items : []),
  );
  const canViewExam = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    if (u.role !== "student") return false;
    return (mine() ?? []).some((course) => course.id === e.course);
  };
  const accessReady = () => auth.user()?.role !== "student" || mine() !== undefined;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()?.id === id() ? exam() : undefined}
        fallback={
          <Show when={exam.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(exam.error)}</Alert>
          </Show>
        }
      >
        {(ex) => (
          <Show when={accessReady()} fallback={<PageSpinner />}>
            <Show when={canViewExam()} fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}>
          <div class="space-y-6">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <Link to="/exams" class="hover:text-foreground">{t("nav.exams")}</Link>
                <span>/</span>
                <Link to="/exams/$id" params={{ id: id() }} class="hover:text-foreground truncate max-w-[12rem]">{ex().title}</Link>
                <span>/</span>
                <span>{t("attempt.title")}</span>
              </div>
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
            </div>
            <ExamRoomWS exam={ex()} />
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
