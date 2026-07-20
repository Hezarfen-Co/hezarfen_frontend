import { Link, useLocation } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getExamById } from "@/api/getExamById";
import { getExamResults } from "@/api/getExamResults";
import { postExamResult } from "@/api/postExamResult";
import { formatApiError } from "@/api/client";
import { AnswerSheetView } from "@/components/exams/answer-sheet-view";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { personId } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ExamAnswerSheetPage() {
  return (
    <RouteGuard>
      <ExamAnswerSheetContent />
    </RouteGuard>
  );
}

function ExamAnswerSheetContent() {
  const auth = useAuth();
  const location = useLocation();
  const t = useT();
  const [mark, setMark] = createSignal("0");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();
  const params = createMemo((prev: { examId: string; userId: string }) => {
    const match = /^\/exam-answers\/([^/]+)\/([^/]+)$/.exec(location().pathname);
    return match ? { examId: decodeURIComponent(match[1]), userId: decodeURIComponent(match[2]) } : prev;
  }, { examId: "", userId: "" });
  const [exam] = createResource(() => params().examId, (examId) => getExamById(examId));
  const [result, { refetch: refetchResult }] = createResource(
    () => params(),
    async ({ examId, userId }) => {
      if (!examId || !userId) return null;
      const page = await getExamResults(examId, { limit: 500, offset: 0 });
      const row = page.items.find((item) => personId(item.user) === userId) ?? null;
      setMark(row ? String(row.mark) : "0");
      return row;
    },
  );
  const canView = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };
  const setClampedMark = (value: string) => {
    if (value === "") {
      setMark(value);
      return;
    }
    const next = Math.max(0, Math.min(100, Number(value)));
    setMark(Number.isNaN(next) ? "" : String(Math.trunc(next)));
  };
  const submitMark = async (event: SubmitEvent) => {
    event.preventDefault();
    const next = Number(mark());
    if (!Number.isInteger(next) || next < 0 || next > 100) {
      setError(t("form.markRange"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await postExamResult(params().examId, { user_id: params().userId, mark: next });
      await refetchResult();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()?.id === params().examId ? exam() : undefined}
        fallback={
          <Show when={exam.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(exam.error)}</Alert>
          </Show>
        }
      >
        {(ex) => (
          <Show when={canView()} fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}>
            <div class="space-y-5">
              <PageHeader
                compact
                accent="rose"
                eyebrow={t("exams.answerSheet")}
                title={ex().title}
                description={ex().description || undefined}
                actions={
                  <Link to="/exams/$id" params={{ id: params().examId }}>
                    <Button variant="ghost" size="sm" class="w-full rounded-md sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                }
              />
              <AnswerSheetView examId={params().examId} userId={params().userId} />
              <form class="rounded-xl border border-border bg-card p-4 shadow-sm" onSubmit={submitMark}>
                <div class="flex flex-wrap items-end gap-3">
                  <div class="min-w-36 flex-1 space-y-1.5">
                    <Label for="answer-sheet-mark">{t("form.mark")}</Label>
                    <Input
                      id="answer-sheet-mark"
                      class="h-10 rounded-sm"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={mark()}
                      onInput={(event) => setClampedMark(event.currentTarget.value)}
                    />
                  </div>
                  <Button type="submit" class="h-10 rounded-sm" disabled={pending() || result.loading}>
                    {t("common.update")}
                  </Button>
                </div>
                <Show when={result()}>
                  {(row) => <p class="mt-2 text-xs text-muted-foreground">{t("form.mark")}: {row().mark}/100</p>}
                </Show>
                <Show when={flash()}>
                  {(msg) => <Alert variant="success" class="mt-3">{msg()}</Alert>}
                </Show>
                <Show when={error()}>
                  {(msg) => <p class="mt-3 text-sm text-destructive">{msg()}</p>}
                </Show>
              </form>
            </div>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
