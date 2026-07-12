import { Link, useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createResource } from "solid-js";
import { getExamById } from "@/api/getExamById";
import { ApiError } from "@/api/client";
import { StudentExamRoom } from "@/components/exams/student-exam-room";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
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
  const t = useT();
  const id = () => decodeURIComponent(location().pathname.split("/")[2] ?? "");
  const [exam] = createResource(id, (examId) => getExamById(examId));

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
          <div class="space-y-6">
            <PageHeader
              compact
              accent="rose"
              eyebrow={t("attempt.title")}
              title={ex().title}
              description={ex().description || undefined}
              actions={
                <div class="flex flex-wrap items-center gap-1 rounded-md border bg-background/70 p-1 shadow-sm">
                  <Link to="/exams/$id" params={{ id: id() }}>
                    <Button variant="ghost" size="sm" class="rounded-sm">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                </div>
              }
            />
            <StudentExamRoom exam={ex()} compact />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
