import { For, Show, Suspense, createResource } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getExams } from "@/api/getExams";
import { ExamCard } from "@/components/exams/exam-card";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

export default function ExamsPage() {
  return (
    <RouteGuard>
      <ExamsContent />
    </RouteGuard>
  );
}

function ExamsContent() {
  const auth = useAuth();
  const t = useT();
  const [exams] = createResource(() => getExams());
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

  return (
    <div class="space-y-6">
      <PageHeader
        accent="rose"
        eyebrow={t("nav.exams")}
        title={t("exams.title")}
        description={t("exams.subtitle")}
        actions={
          canCreate() ? (
            <Link to="/courses">
              <Button>{t("courses.addExam")}</Button>
            </Link>
          ) : undefined
        }
      />

      <CollapsibleHelp title={t("exams.helpTitle")}>
        {t("exams.helpBody")} {t("exams.mustBelongCourse")}
      </CollapsibleHelp>

      <Show when={canCreate()}>
        <p class="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("exams.mustBelongCourse")}{" "}
          <Link to="/courses" class="font-medium text-primary underline-offset-4 hover:underline">
            {t("nav.courses")}
          </Link>
        </p>
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={exams()}>
          {(list) => (
            <Show
              when={list().length > 0}
              fallback={
                <div class="rounded-md border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
                  {t("exams.empty")}
                </div>
              }
            >
              <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <For each={list()}>
                  {(exam) => (
                    <li>
                      <ExamCard exam={exam} />
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
