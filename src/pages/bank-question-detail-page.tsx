import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import {
  deleteBankChoiceImage,
  deleteBankQuestionById,
  deleteBankQuestionImage,
  getBankQuestionById,
} from "@/api/bank-questions";
import { getCourses } from "@/api/courses";
import { formatApiError } from "@/api/client";
import { BankQuestionForm } from "@/components/exams/bank-question-form";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonValue } from "@/components/ui/coming-soon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailField } from "@/components/ui/detail-field";
import { IconChevronLeft, IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDate } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

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
          <div class="mx-auto w-full max-w-[1100px] space-y-6">
            <Show when={error()}>
              <Alert variant="destructive">{error()}</Alert>
            </Show>
            <PageHeader
              eyebrow={t("bank.title")}
              title={current().text}
              description={current().subject_name || t("bank.subtitle")}
              actions={
                <>
                  <Link to="/question-bank">
                    <Button variant="ghost" size="sm">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={canEdit()}>
                    <Button variant="outline" size="sm" class="rounded-lg" onClick={() => setEditing(true)}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button variant="destructive" size="sm" class="rounded-lg" onClick={() => setDeleteOpen(true)}>
                      <IconTrash class="h-4 w-4" />
                      {t("common.delete")}
                    </Button>
                  </Show>
                </>
              }
            />

            <section class="data-shell space-y-5 p-5">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label={t("questions.kind")} value={current().kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")} />
                <DetailField label={t("questions.points")} value={String(current().points)} mono />
                <DetailField label={t("bank.owner")} value={current().owner_name} />
                <DetailField label={t("bank.created")} value={formatDate(current().created_at, locale())} />
                <DetailField label={t("subjects.subject")} value={current().subject_name || "—"} />
                <DetailField label={t("bank.whoCanSee")} value={current().visibility === "school" ? t("bank.sharedWithSchool") : t("bank.onlyMe")} />
                <DetailField label={t("exams.title")} value={current().source_exam || "—"} mono />
                <DetailField label={t("admin.id")} value={current().id} mono />
                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-medium text-muted-foreground">{t("bank.difficulty")}</p>
                  <ComingSoonValue />
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-medium text-muted-foreground">{t("bank.correctRate")}</p>
                  <ComingSoonValue />
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-medium text-muted-foreground">{t("bank.objective")}</p>
                  <ComingSoonValue />
                </div>
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
                      class="text-destructive hover:text-destructive"
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
                              class="h-8 w-8 text-destructive hover:bg-destructive/10"
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

            <SidePanel open={editing()} onOpenChange={setEditing} title={t("bank.edit")} description={current().text} size="wide">
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
