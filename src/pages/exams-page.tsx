import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { ExamCard } from "@/components/exams/exam-card";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatApiError } from "@/api/client";
import { IconChevronRight } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const EXAM_PAGE_SIZE = 6;

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
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? getMyCourses() : []),
  );
  const [openCourse, setOpenCourse] = createSignal<string | null>(null);
  const [sectionPages, setSectionPages] = createSignal<Record<string, number>>({});
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const visibleCourses = createMemo(() => (isStudent() ? mine() : courses()) ?? []);
  const visibleExams = createMemo(() => {
    const all = exams() ?? [];
    if (!isStudent()) return all;
    const allowed = new Set(visibleCourses().map((course) => course.id));
    return all.filter((exam) => allowed.has(exam.course));
  });

  const courseSections = createMemo(() => {
    const all = visibleExams();
    const grouped = new Map<string, typeof all>();
    for (const exam of all) {
      const cid = exam.course;
      if (!grouped.has(cid)) grouped.set(cid, []);
      grouped.get(cid)!.push(exam);
    }
    const knownCourseIds = new Set(visibleCourses().map((c) => c.id));
    const sections = visibleCourses()
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

  const sectionPage = (id: string, totalPages: number) => Math.min(sectionPages()[id] ?? 0, totalPages - 1);
  const setSectionPage = (id: string, page: number) => {
    setSectionPages((current) => ({ ...current, [id]: page }));
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.group.classes")}</span>
          <span>/</span>
          <span>{t("nav.exams")}</span>
        </div>
        <PageHeader
          accent="rose"
          eyebrow={t("nav.exams")}
          title={t("exams.title")}
          description={t("exams.subtitle")}
        />
      </div>

      <Show when={canCreate()}>
        <p class="data-shell px-4 py-3 text-sm text-muted-foreground">
          {t("exams.mustBelongCourse")}{" "}
          <Link to="/courses" class="font-medium text-primary underline-offset-4 hover:underline">
            {t("nav.courses")}
          </Link>
        </p>
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={exams.error}>
          <Alert variant="destructive">{formatApiError(exams.error)}</Alert>
        </Show>
        <Show when={exams()}>
            <Show
              when={visibleExams().length > 0}
              fallback={
                <div class="rounded-md border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
                  {t("exams.empty")}
                </div>
              }
            >
              <div class="space-y-3">
                <For each={courseSections()}>
                  {(section) => {
                    const isOpen = () => openCourse() === section.id;
                    const totalPages = () => Math.max(1, Math.ceil(section.exams.length / EXAM_PAGE_SIZE));
                    const page = () => sectionPage(section.id, totalPages());
                    const pageItems = () => {
                      const start = page() * EXAM_PAGE_SIZE;
                      return section.exams.slice(start, start + EXAM_PAGE_SIZE);
                    };
                    return (
                      <section class="data-shell overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCourse(section.id)}
                          class="flex w-full items-center justify-between gap-3 bg-muted/35 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <div class="flex items-center gap-3">
                            <IconChevronRight
                              class={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen() && "rotate-90")}
                            />
                            <h2 class="font-display text-base font-semibold">{section.title}</h2>
                          </div>
                          <Badge variant="outline" class="mono rounded-sm">{section.exams.length}</Badge>
                        </button>
                        <Show when={isOpen()}>
                          <div class="space-y-4 border-t border-border px-4 pb-4 pt-4">
                            <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <For each={pageItems()}>
                                {(exam) => (
                                  <li>
                                    <ExamCard exam={exam} courseTitle={section.title} now={now()} />
                                  </li>
                                )}
                              </For>
                            </ul>
                            <Show when={section.exams.length > EXAM_PAGE_SIZE}>
                              <PaginationControls page={page()} totalPages={totalPages()} onPageChange={(next) => setSectionPage(section.id, next)} />
                            </Show>
                          </div>
                        </Show>
                      </section>
                    );
                  }}
                </For>
              </div>
            </Show>
        </Show>
      </Suspense>
    </div>
  );
}
