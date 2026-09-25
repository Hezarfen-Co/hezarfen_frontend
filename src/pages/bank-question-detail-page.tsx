import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import {
  deleteBankChoiceImage,
  deleteBankQuestionById,
  deleteBankQuestionImage,
  getBankQuestionById,
} from "@/api/bank-questions";
import { getCourses } from "@/api/courses";
import { getExamById } from "@/api/exams";
import { formatApiError } from "@/api/client";
import { BankQuestionForm } from "@/components/exams/bank-question-form";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailField } from "@/components/ui/detail-field";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDate } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { TableRowActions } from "@/components/ui/table-row-actions";

export default function BankQuestionDetailPage() {
  return (
    <RouteGuard minRole="teacher">
      <BankQuestionDetailContent />
    </RouteGuard>
  );
}

function BankQuestionDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/question-bank/$id" });
  const navigate = useNavigate();
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const id = createMemo(() => {
    location();
    return params().id;
  });
  const [question, { refetch }] = createResource(id, (questionId) => getBankQuestionById(questionId));
  const [courses] = createResource(async () => (await getCourses({ limit: 100 })).items);
  // The exam a question was lifted from is named by its title; an exam the
  // viewer cannot read (or one since deleted) shows as a dash, not its id.
  const [sourceExam] = createResource(
    () => question()?.source_exam || null,
    (examId) => getExamById(examId).then((exam) => exam.title).catch(() => null),
  );
  const manageableCourses = createMemo(() =>
    (courses() ?? []).filter((course) => {
      const current = auth.user();
      return !!current && (
        course.creator.id === current.id ||
        hasMinRole(current.role, "manager")
      );
    }),
  );
  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const canEdit = () => question()?.owner === auth.user()?.id || hasMinRole(auth.user()?.role, "admin");

  // The form can attach a picture but never drop one, so removal lives here
  // beside the image it deletes — same owner/admin gate as every other edit.
  const [imagePending, setImagePending] = createSignal("");
  const removeImage = async (key: string, remove: () => Promise<void>) => {
    if (imagePending()) return;
    setError("");
    setImagePending(key);
    try {
      await remove();
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setImagePending("");
    }
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={question()?.id === id() ? question() : undefined}
        fallback={
          <Show when={question.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(question.error)}</Alert>
          </Show>
        }
      >
        {(current) => (
          <div class="w-full space-y-6">
            <Show when={error()}>
              <Alert variant="destructive">{error()}</Alert>
            </Show>
            <div class="space-y-2">
            <Breadcrumbs items={[{ label: t("bank.title"), to: "/question-bank" }, { label: current().text }]} />
            <PageHeader
              title={current().text}
              description={current().subject_name || undefined}
              actions={
                <>
                  <Show when={canEdit()}>
                    <Button variant="outline" size="sm" class="rounded-lg" onClick={() => setEditing(true)}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <TableRowActions
                      label={t("common.actions")}
                      actions={[{
                        label: t("common.delete"),
                        icon: <IconTrash class="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => setDeleteOpen(true),
                      }]}
                    />
                  </Show>
                </>
              }
            />
            </div>

            <section class="data-shell space-y-5 p-5">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label={t("questions.kind")} value={current().kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")} />
                <DetailField label={t("questions.points")} value={String(current().points)} mono />
                <DetailField label={t("bank.owner")} value={current().owner_name} />
                <DetailField label={t("bank.created")} value={formatDate(current().created_at, locale())} />
                <DetailField label={t("subjects.subject")} value={current().subject_name || "—"} />
                <DetailField label={t("bank.whoCanSee")} value={current().visibility === "school" ? t("bank.sharedWithSchool") : t("bank.onlyMe")} />
                <DetailField label={t("exams.title")} value={(current().source_exam && sourceExam()) || "—"} />
              </div>

              <Show when={current().image}>
                <div class="space-y-2">
                  <img
                    src={`/api/bank-questions/${current().id}/image`}
                    alt={t("questions.image")}
                    class="max-h-80 rounded-lg border border-border-line bg-surface-overlay object-contain"
                  />
                  <Show when={canEdit()}>
                    <Button
                      variant="outline"
                      size="sm"
                      class="text-destructive-text hover:text-destructive-text"
                      disabled={imagePending() === "question"}
                      onClick={() => void removeImage("question", () => deleteBankQuestionImage(current().id))}
                    >
                      <IconTrash class="h-4 w-4" />
                      {t("common.remove")}
                    </Button>
                  </Show>
                </div>
              </Show>

              <Show when={current().choices?.length}>
                <div class="space-y-2">
                  <p class="text-xs font-medium text-text-subtle">{t("questions.correct")}</p>
                  <For each={current().choices ?? []}>
                    {(choice, index) => (
                      <div class="flex items-center gap-3 rounded-md border border-border-line bg-surface-overlay px-3 py-2.5">
                        <Badge variant={choice.id === current().correct ? "default" : "outline"}>{index() + 1}</Badge>
                        <span class="min-w-0 flex-1">{choice.text}</span>
                        <Show when={current().choice_images?.[index()]}>
                          <img
                            src={`/api/bank-questions/${current().id}/choices/${choice.id}/image`}
                            alt=""
                            class="h-12 w-12 rounded-md border object-cover"
                          />
                          <Show when={canEdit()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              class="h-8 w-8 text-destructive-text hover:bg-destructive/10"
                              aria-label={t("common.remove")}
                              disabled={imagePending() === choice.id}
                              onClick={() => void removeImage(choice.id, () => deleteBankChoiceImage(current().id, choice.id))}
                            >
                              <IconTrash class="h-4 w-4" />
                            </Button>
                          </Show>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>

            <SidePanel guardUnsaved open={editing()} onOpenChange={setEditing} title={t("bank.edit")} description={current().text} size="wide">
              <BankQuestionForm
                initial={current()}
                courses={manageableCourses()}
                onSaved={async () => {
                  setEditing(false);
                  await refetch();
                }}
                onCancel={() => setEditing(false)}
              />
            </SidePanel>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={current().text}
              onConfirm={async () => {
                setError("");
                try {
                  await deleteBankQuestionById(current().id);
                  await navigate({ to: "/question-bank" });
                } catch (err) {
                  setError(formatApiError(err));
                }
              }}
            />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
