import { Show, Suspense, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getClassById } from "@/api/classes";
import { getCourseById, getCourseSubjects } from "@/api/courses";
import { getLimits } from "@/api/limits";
import {
  deleteInstanceEnrollmentByUserId,
  getInstanceById,
  getInstanceEnrollments,
  getInstanceExams,
  patchInstanceById,
  postInstanceEnrollment,
  postInstanceExam,
} from "@/api/instances";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import type { Enrollment, Exam, MaterializeReport } from "@/api/client";
import { patchExamById } from "@/api/exams";
import { ExamLink } from "@/components/exams/exam-link";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { CourseTeachersPanel } from "@/components/courses/course-teachers-panel";
import { CourseHomeworkPanel } from "@/components/homework/course-homework-panel";
import { CourseSessionsPanel } from "@/components/sessions/course-sessions-panel";
import { InstanceSettingsPanel } from "@/components/instances/instance-settings-panel";
import { InstanceWeeklyPlanPanel } from "@/components/instances/instance-weekly-plan-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconAlert, IconCalendarDays, IconClock, IconExam, IconHomework, IconPlus, IconSchool, IconSettings, IconTrash, IconUsers } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { hasMinRole } from "@/lib/roles";
import { createUrlString } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { useModules } from "@/stores/modules-context";
import { useT } from "@/stores/preferences-context";

export default function InstanceDetailPage() {
  return (
    <RouteGuard>
      <InstanceDetailContent />
    </RouteGuard>
  );
}

function InstanceDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/instances/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  // `?tab=sessions&rollCall=<session id>` opens straight on a lesson's roll
  // call — the dashboard's "today's lessons" panel links here.
  const linkedSearch = () => location().search as { tab?: unknown; rollCall?: unknown };
  const linkedRollCall = () => (typeof linkedSearch().rollCall === "string" ? (linkedSearch().rollCall as string) : undefined);
  // The open tab is `?tab=` itself, so Back from an exam or a homework lands
  // on the tab it was opened from.
  const [requestedTab, setTab] = createUrlString("tab", "exams");
  // Exams, homework and sessions are separately sold modules; a tab for one the
  // school switched off would only ever answer 403, so it is left out and the
  // page falls back to the first tab still there.
  const modules = useModules();
  const tabOn = {
    exams: () => modules.isEnabled("exams"),
    homework: () => modules.isEnabled("homework"),
    sessions: () => modules.isEnabled("sessions"),
  };
  // A tab that is not on offer (module off, no rights yet) shows the first
  // one that is, without rewriting the URL: rights settle after the instance
  // loads, and the requested tab must still be there when they do.
  const tab = () => {
    const tabs = [
      ...(tabOn.exams() ? ["exams"] : []),
      ...(tabOn.homework() ? ["homework"] : []),
      ...(tabOn.sessions() ? ["sessions"] : []),
      "plan",
      "teachers",
      ...(canManage() ? ["students", "settings"] : []),
    ];
    return tabs.includes(requestedTab()) ? requestedTab() : tabs[0];
  };
  const [instance, { refetch: refetchInstance }] = createResource(id, (instanceId) => getInstanceById(instanceId));
  const [course] = createResource(() => instance()?.course ?? null, (courseId) => getCourseById(courseId));
  const [klass] = createResource(() => instance()?.class ?? null, (classId) => getClassById(classId).catch(() => null));
  const [settings] = createResource(() => getSettings());
  const [limits] = createResource(() => (canManage() ? true : null), () => getLimits());
  // Only the settings tab edits the topic set, so only it loads the catalog's.
  const [courseSubjects] = createResource(
    () => (canManage() && tab() === "settings" ? instance()?.course ?? null : null),
    async (courseId) => (courseId ? (await getCourseSubjects(courseId)).items : []),
  );
  // The section's resolved weight map, in the shape examWeight() reads.
  const sectionWeights = () => instance()?.exam_weights.map((entry) => ({ name: entry.kind, weight: entry.weight })) ?? settings()?.exam_kinds;

  // Manager+, an assigned teacher, or the şube's homeroom teacher may run it.
  const canManage = () => {
    const i = instance();
    const u = auth.user();
    if (!i || !u) return false;
    if (hasMinRole(u.role, "manager")) return true;
    if (i.teachers.some((teacher) => teacher.id === u.id)) return true;
    return klass.latest?.teacher?.id === u.id;
  };
  const canStaff = () => hasMinRole(auth.user()?.role ?? "student", "manager");

  const [exams, { refetch: refetchExams }] = createResource(
    () => (tabOn.exams() ? id() : null),
    async (instanceId) => (instanceId ? (await getInstanceExams(instanceId)).items : []),
  );
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (canManage() ? id() : null),
    async (instanceId) => (instanceId ? (await getInstanceEnrollments(instanceId)).items : []),
  );

  const [showExamForm, setShowExamForm] = createSignal(false);
  const [examCreateStep, setExamCreateStep] = createSignal<"details" | "questions">("details");
  const [createdExam, setCreatedExam] = createSignal<Exam | null>(null);
  const [showSessionForm, setShowSessionForm] = createSignal(false);
  const [showHomeworkForm, setShowHomeworkForm] = createSignal(false);
  const [showTeacherForm, setShowTeacherForm] = createSignal(false);
  const [showEnrollPanel, setShowEnrollPanel] = createSignal(false);
  const [sessionCount, setSessionCount] = createSignal(0);
  const [homeworkCount, setHomeworkCount] = createSignal(0);
  const [enrollUserId, setEnrollUserId] = createSignal("");
  const [removeTarget, setRemoveTarget] = createSignal<{ userId: string; userName: string } | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  // Policy edits are two inline writes on a shared resource, so they keep local
  // signals and PATCH optimistically instead of refetching the instance. Both
  // write only on an explicit act — Enter or the save button for ders saati, a
  // confirmation for the karne switch — so a stray tap while scrolling on a
  // phone never changes the record.
  const [countsTowardKarne, setCountsTowardKarne] = createSignal(true);
  const [dersSaati, setDersSaati] = createSignal("");
  const [savedDersSaati, setSavedDersSaati] = createSignal<number | null>(null);
  const [savingPolicy, setSavingPolicy] = createSignal(false);
  const [karneConfirm, setKarneConfirm] = createSignal<boolean | null>(null);
  const [policySaved, setPolicySaved] = createSignal<"dersSaati" | "karne" | null>(null);
  // A header edit sets the section's own override without refetching the
  // instance; the settings tab reads these so its badges stay truthful.
  const [dersSaatiOwn, setDersSaatiOwn] = createSignal(false);
  const [karneOwn, setKarneOwn] = createSignal(false);
  let policySavedTimer: number | undefined;
  onCleanup(() => window.clearTimeout(policySavedTimer));
  const flashPolicySaved = (which: "dersSaati" | "karne") => {
    setPolicySaved(which);
    window.clearTimeout(policySavedTimer);
    policySavedTimer = window.setTimeout(() => setPolicySaved(null), 2500);
  };
  createEffect(() => {
    const i = instance();
    if (!i) return;
    setCountsTowardKarne(i.counts_toward_karne);
    setDersSaati(String(i.ders_saati));
    setSavedDersSaati(i.ders_saati);
    setDersSaatiOwn(i.ders_saati_overridden);
    setKarneOwn(i.counts_toward_karne_overridden);
  });
  const dersSaatiDirty = () => dersSaati().trim() !== String(savedDersSaati() ?? "");

  const toggleKarne = async (next: boolean) => {
    if (savingPolicy()) return;
    setCountsTowardKarne(next);
    setSavingPolicy(true);
    try {
      await patchInstanceById(id(), { counts_toward_karne: next });
      setKarneOwn(true);
      flashPolicySaved("karne");
    } catch (err) {
      setCountsTowardKarne(!next);
      setError(formatApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const saveDersSaati = async () => {
    if (savingPolicy()) return;
    const value = Number(dersSaati().trim());
    const current = savedDersSaati();
    if (dersSaati().trim() === "" || !Number.isInteger(value) || value < 0) {
      setError(t("instances.dersSaatiInvalid"));
      return;
    }
    if (value === current) return;
    setError("");
    setSavingPolicy(true);
    try {
      await patchInstanceById(id(), { ders_saati: value });
      setSavedDersSaati(value);
      setDersSaati(String(value));
      setDersSaatiOwn(true);
      flashPolicySaved("dersSaati");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    if (mode === "open") return t("exams.mode.open");
    return t("exams.unscheduled");
  };
  const examCount = createMemo(() => exams()?.length ?? 0);
  const rosterCount = createMemo(() => roster()?.length ?? 0);
  const enrolledUserIds = () => (roster() ?? []).map((row) => row.user.id);

  const rosterColumns = createMemo<ColumnDef<Enrollment>[]>(() => [
    {
      id: "student",
      accessorFn: (row) => row.user.display_name || row.user.username,
      header: t("roster.studentName"),
      meta: { cellClass: "max-w-0 font-medium" },
      cell: (cell) => {
        const name = cell.row.original.user.display_name || t("exams.nameless");
        return <span class="block truncate" title={name}>{name}</span>;
      },
    },
    {
      // How the student got here (through the şube vs. added directly) is its
      // own column, not a badge beside the name.
      id: "source",
      accessorFn: (row) => (row.source ? 1 : 0),
      header: t("roster.enrolledVia"),
      cell: (cell) =>
        cell.row.original.source
          ? <Badge variant="secondary" class="rounded-full text-xs font-normal">{t("course.fromClass", { name: klass.latest?.name ?? "—" })}</Badge>
          : <span class="text-muted-foreground">—</span>,
    },
    {
      id: "class",
      accessorFn: () => klass.latest?.name ?? "—",
      header: t("roster.class"),
      meta: { cellClass: "text-muted-foreground" },
      cell: () => klass.latest?.name ?? "—",
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <Show when={canManage()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              {
                label: t("common.remove"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () =>
                  setRemoveTarget({
                    userId: cell.row.original.user.id,
                    userName: cell.row.original.user.display_name || t("exams.nameless"),
                  }),
              },
            ]}
          />
        </Show>
      ),
    },
  ]);

  const examColumns = createMemo<ColumnDef<Exam>[]>(() => [
    {
      accessorKey: "title",
      header: t("form.title"),
      meta: { cellClass: "max-w-0 font-medium" },
      cell: (cell) => (
        <ExamLink examId={cell.row.original.id} class="block truncate hover:text-primary-text hover:underline" title={cell.row.original.title}>
          {cell.row.original.title}
        </ExamLink>
      ),
    },
    {
      id: "kind",
      accessorFn: (row) => examKindLabel(String(row.kind), t),
      header: t("exams.kind"),
      cell: (cell) => (
        <Badge variant="outline" class="rounded-full capitalize">
          {examKindLabel(String(cell.row.original.kind), t)}
        </Badge>
      ),
    },
    {
      // The kind's weight in this şube's average: its own column, not a
      // parenthesised suffix inside the kind badge.
      id: "weight",
      accessorFn: (row) => examWeight(row, sectionWeights()) ?? -1,
      header: t("courses.weight"),
      meta: { cellClass: "tabular-nums" },
      cell: (cell) => examWeight(cell.row.original, sectionWeights()) ?? "—",
    },
    {
      id: "mode",
      accessorFn: (row) => examModeLabel(row.mode),
      header: t("exams.mode"),
      cell: (cell) => <Badge variant="secondary" class="rounded-full">{examModeLabel(cell.row.original.mode)}</Badge>,
    },
    {
      id: "status",
      accessorFn: (row) => (row.draft ? t("exams.draft") : ""),
      header: t("events.status"),
      cell: (cell) => (
        <Show when={cell.row.original.draft} fallback="—">
          <Badge variant="secondary" class="rounded-full">{t("exams.draft")}</Badge>
        </Show>
      ),
    },
  ]);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={instance()?.id === id() ? instance() : undefined}
        fallback={
          <Show when={instance.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(instance.error)}</Alert>
          </Show>
        }
      >
        {(inst) => (
          <div class="w-full space-y-4">
            <div class="space-y-1.5">
              <Breadcrumbs
                items={[
                  { label: t("courses.title"), to: "/courses" },
                  { label: course.latest?.title ?? "…", to: "/courses/$id", params: { id: inst().course } },
                  { label: klass.latest?.name ?? t("instances.title") },
                ]}
              />
              <PageHeader
                title={`${inst().title} — ${klass.latest?.name ?? ""}`.replace(/^ — | — $/, "")}
                description={inst().description || t("instances.selectSectionHelp")}
                class="border-border-line"
              />
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconCalendarDays class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("instances.dersSaati")}</p>
                    <Show
                      when={canManage()}
                      fallback={<p class="truncate text-sm font-semibold text-text-default">{inst().ders_saati}</p>}
                    >
                      <form
                        class="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void saveDersSaati();
                        }}
                      >
                        <Input
                          aria-label={t("instances.dersSaati")}
                          class="h-7 w-20 px-2 py-0 text-base sm:text-sm"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={dersSaati()}
                          disabled={savingPolicy()}
                          onInput={(e) => setDersSaati(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape" && dersSaatiDirty()) {
                              e.preventDefault();
                              setDersSaati(String(savedDersSaati() ?? ""));
                            }
                          }}
                        />
                        <Show when={dersSaatiDirty()}>
                          <Button type="submit" size="sm" class="h-7 rounded-md px-2 text-xs" disabled={savingPolicy()}>
                            {t("common.save")}
                          </Button>
                        </Show>
                        <Show when={!dersSaatiDirty() && policySaved() === "dersSaati"}>
                          <span class="text-xs text-success-text" role="status">{t("instances.policySaved")}</span>
                        </Show>
                      </form>
                    </Show>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconSchool class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("instances.countsTowardKarne")}</p>
                    <Show
                      when={canManage()}
                      fallback={
                        <p class="truncate text-sm font-semibold text-text-default">
                          {inst().counts_toward_karne ? t("common.yes") : t("common.no")}
                        </p>
                      }
                    >
                      <label class="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <span class="relative shrink-0">
                          <input
                            type="checkbox"
                            class="peer sr-only"
                            checked={countsTowardKarne()}
                            disabled={savingPolicy()}
                            aria-label={t("instances.countsTowardKarne")}
                            onChange={(event) => {
                              // Keep the switch where it is until the change is confirmed.
                              const next = event.currentTarget.checked;
                              event.currentTarget.checked = !next;
                              setKarneConfirm(next);
                            }}
                          />
                          <span class="block h-6 w-10 rounded-full bg-input ring-1 ring-inset ring-black/5 transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:ring-white/10" />
                          <span class="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                        </span>
                        <span class="font-semibold text-text-default">{countsTowardKarne() ? t("common.yes") : t("common.no")}</span>
                        <Show when={policySaved() === "karne"}>
                          <span class="text-success-text" role="status">{t("instances.policySaved")}</span>
                        </Show>
                      </label>
                    </Show>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconUsers class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("courses.roster")}</p>
                    <p class="truncate text-sm font-semibold text-text-default">{inst().enrollment_count}</p>
                  </div>
                </div>
                <Show when={tabOn.exams()}>
                  <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                      <IconExam class="h-4 w-4" />
                    </span>
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-text-subtle">{t("courses.exams")}</p>
                      <p class="truncate text-sm font-semibold text-text-default">{examCount()}</p>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            <ConfirmDialog
              open={karneConfirm() !== null}
              onOpenChange={(open) => !open && setKarneConfirm(null)}
              title={t("instances.karneConfirmTitle")}
              description={karneConfirm() ? t("instances.karneOnHint") : t("instances.karneOffHint")}
              summary={`${inst().title} — ${klass.latest?.name ?? ""}`.replace(/^ — | — $/, "")}
              confirmLabel={karneConfirm() ? t("instances.karneTurnOn") : t("instances.karneTurnOff")}
              onConfirm={async () => {
                const next = karneConfirm();
                if (next !== null) await toggleKarne(next);
              }}
            />

            <ConfirmDialog
              open={removeTarget() !== null}
              onOpenChange={() => setRemoveTarget(null)}
              title={t("course.removeStudentTitle")}
              description={t("course.removeStudentHint")}
              variant="destructive"
              icon={<IconAlert class="h-4 w-4" />}
              confirmLabel={t("course.removeStudentAction")}
              summary={removeTarget()?.userName ?? ""}
              onConfirm={async () => {
                const target = removeTarget();
                if (!target) return;
                try {
                  await deleteInstanceEnrollmentByUserId(id(), target.userId);
                  await refetchRoster();
                  setFlash(t("common.deleted"));
                } catch (err) {
                  setError(formatApiError(err));
                } finally {
                  setRemoveTarget(null);
                }
              }}
            />

            <SidePanel
              open={showExamForm()}
              onOpenChange={(open) => {
                setShowExamForm(open);
                if (!open) {
                  setCreatedExam(null);
                  setExamCreateStep("details");
                }
              }}
              title={createdExam() ? createdExam()!.title : t("courses.addExam")}
              description={createdExam() ? t("exams.step2Questions") : course.latest?.title}
              size={examCreateStep() === "questions" ? "wide" : "default"}
            >
              <div class="mb-4 flex rounded-xl border border-border-line bg-surface-tint p-1">
                <button
                  type="button"
                  class={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "details"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-text-subtle hover:bg-surface-fill",
                  )}
                  onClick={() => setExamCreateStep("details")}
                >
                  {t("exams.step1Details")}
                </button>
                <button
                  type="button"
                  disabled={!createdExam()}
                  class={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "questions"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : createdExam()
                      ? "text-text-subtle hover:bg-surface-fill"
                      : "opacity-40 cursor-not-allowed text-text-subtle",
                  )}
                  onClick={() => createdExam() && setExamCreateStep("questions")}
                >
                  {t("exams.step2Questions")}
                </button>
              </div>

              <Show when={examCreateStep() === "details"}>
                <ExamForm
                  initial={createdExam() ?? undefined}
                  submitLabel={createdExam() ? t("common.update") : t("exams.nextQuestions")}
                  onCancel={() => setShowExamForm(false)}
                  onSubmit={async (values: ExamFormValues) => {
                    const existing = createdExam();
                    if (existing) {
                      // `term` is create-only: the backend cannot move a filed exam.
                      const { term: _term, ...patch } = values;
                      const updated = await patchExamById(existing.id, patch);
                      setCreatedExam(updated);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.saved"));
                    } else {
                      const newExam = await postInstanceExam(id(), {
                        ...values,
                        description: values.description.trim() || undefined,
                      });
                      setCreatedExam(newExam);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.created"));
                    }
                  }}
                />
              </Show>

              <Show when={examCreateStep() === "questions" && createdExam()}>
                <div class="space-y-4">
                  <ExamQuestionsPanel examId={createdExam()!.id} courseId={inst().course} instanceId={inst().id} embedded />
                  <div class="flex justify-end border-t pt-3">
                    <Button type="button" variant="default" onClick={() => setShowExamForm(false)}>
                      {t("exams.finishAndClose")}
                    </Button>
                  </div>
                </div>
              </Show>
            </SidePanel>

            <SidePanel open={showEnrollPanel()} onOpenChange={setShowEnrollPanel} title={t("courses.enroll")} description={course.latest?.title}>
              <form
                class="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    setError("");
                    setPending(true);
                    try {
                      const uid = enrollUserId().trim();
                      if (!uid) throw new Error(t("events.userId"));
                      await postInstanceEnrollment(id(), uid);
                      setEnrollUserId("");
                      setShowEnrollPanel(false);
                      await refetchRoster();
                      setFlash(t("common.saved"));
                    } catch (err) {
                      setError(formatApiError(err));
                    } finally {
                      setPending(false);
                    }
                  })();
                }}
              >
                <UserSearchSelect
                  id="instance-enroll-user"
                  value={enrollUserId()}
                  excludeIds={enrolledUserIds()}
                  placeholder={t("form.selectStudent")}
                  onChange={setEnrollUserId}
                  role="student"
                />
                <div class="flex flex-wrap gap-2">
                  <Button type="submit" class="rounded-xl" disabled={pending()}>
                    {t("courses.enroll")}
                  </Button>
                  <Button type="button" variant="outline" class="rounded-xl" onClick={() => setShowEnrollPanel(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </SidePanel>

            <Show when={flash()}>
              <Alert variant="success">{flash()}</Alert>
            </Show>
            <Show when={error()}>
              <p class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
            </Show>

            <Tabs value={tab()} onChange={setTab} class="space-y-4">
              <TabsList class="flex w-full justify-start overflow-x-auto sm:grid sm:grid-cols-4 xl:grid-cols-7" aria-label={inst().title}>
                <Show when={tabOn.exams()}>
                  <TabsTrigger value="exams" class="min-w-0"><IconExam class="h-4 w-4" />{t("courses.exams")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">{examCount()}</Badge></TabsTrigger>
                </Show>
                <Show when={tabOn.homework()}>
                  <TabsTrigger value="homework" class="min-w-0"><IconHomework class="h-4 w-4" />{t("homework.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">{homeworkCount()}</Badge></TabsTrigger>
                </Show>
                <Show when={tabOn.sessions()}>
                  <TabsTrigger value="sessions" class="min-w-0"><IconCalendarDays class="h-4 w-4" />{t("sessions.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">{sessionCount()}</Badge></TabsTrigger>
                </Show>
                <TabsTrigger value="plan" class="min-w-0"><IconClock class="h-4 w-4" />{t("weeklyPlan.tab")}</TabsTrigger>
                <TabsTrigger value="teachers" class="min-w-0"><IconSchool class="h-4 w-4" />{t("courses.teachers")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">{inst().teachers.length}</Badge></TabsTrigger>
                <Show when={canManage()}>
                  <TabsTrigger value="students" class="min-w-0"><IconUsers class="h-4 w-4" />{t("courses.roster")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">{rosterCount()}</Badge></TabsTrigger>
                  <TabsTrigger value="settings" class="min-w-0"><IconSettings class="h-4 w-4" />{t("instances.settingsTab")}</TabsTrigger>
                </Show>
              </TabsList>

              <Show when={tabOn.exams()}>
              <TabsContent value="exams" class="space-y-3">
                {/* Each tab's add button rides in its table's toolbar card
                    (search, add, columns), like the list pages; the tab label
                    and the pager already carry the count. */}
                <Suspense fallback={<DataTableSkeleton />}>
                  <DataTable
                    columns={examColumns()}
                    data={exams() ?? []}
                    filterColumn="title"
                    enablePagination
                    pageSize={10}
                    empty={t("exams.empty")}
                    actions={canManage() ? (
                      <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowExamForm(true)}>
                        <IconPlus class="h-4 w-4" />{t("courses.addExam")}
                      </Button>
                    ) : undefined}
                    onRowClick={(exam) => void navigate({ to: "/exams/$id", params: { id: exam.id } })}
                  />
                </Suspense>
              </TabsContent>
              </Show>

              <Show when={tabOn.homework()}>
              <TabsContent value="homework" class="space-y-3">
                <CourseHomeworkPanel
                  instanceId={id()}
                  courseId={inst().course}
                  canManage={canManage()}
                  active={tab() === "homework"}
                  createOpen={showHomeworkForm()}
                  onCreateOpenChange={setShowHomeworkForm}
                  onCountChange={setHomeworkCount}
                />
              </TabsContent>
              </Show>

              <Show when={tabOn.sessions()}>
              <TabsContent value="sessions" class="space-y-3">
                <CourseSessionsPanel
                  instanceId={id()}
                  roster={roster() ?? []}
                  teachers={inst().teachers}
                  canManage={canManage()}
                  canManageStaff={canStaff()}
                  active={tab() === "sessions"}
                  createOpen={showSessionForm()}
                  onCreateOpenChange={setShowSessionForm}
                  onCountChange={setSessionCount}
                  openRollCallFor={linkedRollCall()}
                />
              </TabsContent>
              </Show>

              <TabsContent value="plan" class="space-y-3">
                <InstanceWeeklyPlanPanel
                  instance={inst()}
                  canManage={canManage()}
                  canGenerate={tabOn.sessions()}
                  limits={limits.latest?.weekly_plan}
                  maxTopicLen={limits.latest?.course.max_session_topic_len}
                  onChanged={refetchInstance}
                  onLessonsCreated={(report: MaterializeReport) => {
                    setFlash(t("weeklyPlan.appliedSummary", { count: report.created.length }));
                    setTab("sessions");
                  }}
                />
              </TabsContent>

              <TabsContent value="teachers" class="space-y-3">
                <CourseTeachersPanel
                  instanceId={id()}
                  teachers={inst().teachers}
                  canStaff={canStaff()}
                  assignOpen={showTeacherForm()}
                  onAssignOpenChange={setShowTeacherForm}
                  onInstanceUpdated={refetchInstance}
                />
              </TabsContent>

              <Show when={canManage()}>
                <TabsContent value="students" class="space-y-3">
                  <Suspense fallback={<DataTableSkeleton />}>
                    <DataTable
                      columns={rosterColumns()}
                      data={roster() ?? []}
                      filterColumn="student"
                      enablePagination
                      pageSize={10}
                      empty={t("exams.emptyRoster")}
                      emptyIllustration="people"
                      actions={
                        <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowEnrollPanel(true)}>
                          <IconPlus class="h-4 w-4" />{t("courses.enroll")}
                        </Button>
                      }
                    />
                  </Suspense>
                </TabsContent>
                <TabsContent value="settings" class="space-y-3">
                  <InstanceSettingsPanel
                    instance={{
                      ...inst(),
                      ders_saati: savedDersSaati() ?? inst().ders_saati,
                      ders_saati_overridden: dersSaatiOwn(),
                      counts_toward_karne: countsTowardKarne(),
                      counts_toward_karne_overridden: karneOwn(),
                    }}
                    canManage={canManage()}
                    courseSubjects={courseSubjects() ?? []}
                    examKinds={(settings()?.exam_kinds ?? []).map((kind) => kind.name)}
                    maxTitleLen={limits.latest?.course.max_title_len}
                    maxDescriptionLen={limits.latest?.course.max_description_len}
                    onChanged={refetchInstance}
                  />
                </TabsContent>
              </Show>
            </Tabs>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
