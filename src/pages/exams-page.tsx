import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getExams } from "@/api/getExams";
import { ExamCard } from "@/components/exams/exam-card";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronRight } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
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
  const now = createNow();
  const [exams] = createResource(() => getExams());
  const [courses] = createResource(() => getCourses());
  const [openCourse, setOpenCourse] = createSignal<string | null>(null);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

  const courseSections = createMemo(() => {
    const all = exams();
    if (!all) return [];
    const grouped = new Map<string, typeof all>();
    for (const exam of all) {
      const cid = exam.course;
      if (!grouped.has(cid)) grouped.set(cid, []);
      grouped.get(cid)!.push(exam);
    }
    const knownCourseIds = new Set((courses() ?? []).map((c) => c.id));
    const sections = (courses() ?? [])
      .filter((c) => (grouped.get(c.id)?.length ?? 0) > 0)
      .map((c) => ({ id: c.id, title: c.title, exams: grouped.get(c.id)! }));
    const missingCourseExams = all.filter((exam) => !knownCourseIds.has(exam.course));
    if (missingCourseExams.length > 0) {
      sections.push({ id: "__missing_course__", title: t("exams.missingCourse"), exams: missingCourseExams });
    }
    return sections;
  });

  const toggleCourse = (id: string) => {
    setOpenCourse((prev) => (prev === id ? null : id));
  };

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
              <div class="space-y-4">
                <For each={courseSections()}>
                  {(section) => {
                    const isOpen = () => openCourse() === section.id;
                    return (
                      <section class="surface-card overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCourse(section.id)}
                          class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
                        >
                          <div class="flex items-center gap-3">
                            <IconChevronRight
                              class={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen() && "rotate-90")}
                            />
                            <h2 class="font-display text-base font-semibold">{section.title}</h2>
                          </div>
                          <Badge variant="outline" class="rounded-sm">{section.exams.length}</Badge>
                        </button>
                        <Show when={isOpen()}>
                          <div class="border-t border-border/50 px-5 pb-5 pt-4">
                            <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              <For each={section.exams}>
                                {(exam) => (
                                  <li>
                                    <ExamCard exam={exam} courseTitle={section.title} now={now()} />
                                  </li>
                                )}
                              </For>
                            </ul>
                          </div>
                        </Show>
                      </section>
                    );
                  }}
                </For>
              </div>
            </Show>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
