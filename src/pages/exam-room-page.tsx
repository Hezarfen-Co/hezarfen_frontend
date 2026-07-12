import { Link, useParams } from "@tanstack/solid-router";
import { Show, Suspense, createResource } from "solid-js";
import { getExamById } from "@/api/getExamById";
import { ApiError } from "@/api/client";
import { StudentExamRoom } from "@/components/exams/student-exam-room";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  const params = useParams({ from: "/exam-room/$id" });
  const t = useT();
  const id = () => params().id;
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
              accent="rose"
              eyebrow={t("attempt.title")}
              title={ex().title}
              description={ex().description || undefined}
              actions={
                <Link to="/exams/$id" params={{ id: id() }}>
                  <Button variant="outline" size="sm">
                    {t("common.back")}
                  </Button>
                </Link>
              }
            />
            <StudentExamRoom exam={ex()} compact />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
