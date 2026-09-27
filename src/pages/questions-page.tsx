import { For, Show, Suspense, createEffect, createSignal, lazy } from "solid-js";
import { createScrollRestore } from "@/lib/scroll-restore";
import { createResource } from "@/lib/create-resource";
import { createInfiniteList } from "@/lib/infinite-list";
import { InfiniteSentinel } from "@/components/ui/infinite-sentinel";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/solid-router";
import { getQuestions, postQuestion, deleteQuestionById } from "@/api/shared";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { DataSection } from "@/components/ui/data-section";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconPlus, IconClock, IconCheck, IconPhoto, IconX, IconEdit, IconTrash } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";

import { ErrorAlert } from "@/components/ui/error-alert";
import { showToast } from "@/components/ui/toast";
import { usePreferences, useT } from "@/stores/preferences-context";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/stores/auth-context";
import { cn } from "@/lib/cn";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";

// Lazy so the drawing pad rides its own chunk, off the question list's initial load.
const DrawCanvas = lazy(() => import("@/components/ui/draw-canvas").then((m) => ({ default: m.DrawCanvas })));

export default function QuestionsPage() {
  return (
    <RouteGuard minRole="student">
      <QuestionsContent />
    </RouteGuard>
  );
}

function QuestionsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false });

  const statusFilter = () => ((searchParams() as any).status === "pending" ? "pending" : "approved");

  // The status is the only filter and the backend applies it, so the pool
  // loads a page at a time as the reader scrolls (it used to stop at 50).
  const questions = createInfiniteList(
    () => statusFilter(),
    (status, paging) => getQuestions(status, paging),
    { restoreKey: "questions" },
  );
  const list = () => questions.items();
  // Back from a question lands on the same row once the list is drawn.
  createScrollRestore(`questions:${statusFilter()}`, () => list().length > 0);
  const refetch = () => questions.refresh();

  const [askOpen, setAskOpen] = createSignal(location().searchStr.includes("action=new"));
  const [questionToDelete, setQuestionToDelete] = createSignal<any | null>(null);

  createEffect(() => {
    if (location().searchStr.includes("action=new")) {
      setAskOpen(true);
    }
  });

  const poolTabClass = (active: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-r border-r-border-line px-3 text-sm font-medium transition-colors last:border-r-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-b-primary bg-surface-base text-foreground"
        : "border-b-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    );

  const canDelete = (question: any) =>
    question.asker.id === auth.user()?.id || hasMinRole(auth.user()?.role, "teacher");

  const handleDeleteConfirmed = async () => {
    const q = questionToDelete();
    if (!q) return;
    try {
      await deleteQuestionById(q.id);
      showToast({ title: t("common.deleted") });
      setQuestionToDelete(null);
      refetch();
    } catch (err: unknown) {
      showToast({ title: formatApiError(err) });
      setQuestionToDelete(null);
    }
  };

  return (
    <div class="space-y-6">
      {/* Links, since the status lives in the URL, drawn like the app's Tabs
          (TabsList / TabsTrigger) so this row matches every other tab row. */}
      <nav aria-label={t("pool.title")} class="inline-flex h-auto w-full max-w-full items-stretch overflow-x-auto rounded-lg border border-border-line bg-surface-base sm:w-fit">
        <Link
          to="/questions"
          search={{ status: "approved" }}
          aria-current={statusFilter() === "approved" ? "page" : undefined}
          class={poolTabClass(statusFilter() === "approved")}
        >
          {t("pool.approved")}
        </Link>
        <Link
          to="/questions"
          search={{ status: "pending" }}
          aria-current={statusFilter() === "pending" ? "page" : undefined}
          class={poolTabClass(statusFilter() === "pending")}
        >
          {t("pool.pending")}
        </Link>
      </nav>

      <DataSection
        title={t("pool.title")}
        description={t("pool.subtitle")}
        actions={
          <Show when={auth.user()?.role === "student"}>
            <Button type="button" size="sm" onClick={() => setAskOpen(true)}>
              <IconPlus class="h-4 w-4" />
              {t("pool.ask")}
            </Button>
          </Show>
        }
      >
        <div class="-mx-4 -mb-4 border-t border-border-hairline">
        <Show when={questions.error()}>
          {(err) => <Alert variant="destructive" class="m-4">{formatApiError(err())}</Alert>}
        </Show>
        <Show when={!questions.initialLoading()} fallback={<PageSpinner />}>
            <Show when={list().length > 0} fallback={<EmptyState kind="search" title={t("pool.noQuestions")} />}>
              <div class="divide-y divide-border">
                <For each={list()}>
                  {(question) => (
                    <div class="group flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                      <Link to="/questions/$id" params={{ id: question.id }} class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="truncate text-base font-semibold text-foreground group-hover:text-primary-text transition-colors">{question.title}</h3>
                          <Show when={question.image}>
                            <IconPhoto class="h-4 w-4 shrink-0 text-muted-foreground" aria-label={t("pool.image")} />
                          </Show>
                        </div>
                        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.body}</p>
                        <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span class="flex items-center gap-1">
                            <div class="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary-text">
                              {question.asker.display_name?.[0] || question.asker.username[0].toUpperCase()}
                            </div>
                            {personLabel(question.asker)}
                          </span>
                          <span>&bull;</span>
                          <span>{formatDate(question.asked_at, locale())}</span>
                        </div>
                      </Link>

                      <div class="mt-2 flex items-center gap-3 sm:mt-0 sm:pl-4 shrink-0">
                        <Show
                          when={question.status === "approved"}
                          fallback={<span class="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-text"><IconClock class="mr-1 h-3 w-3" /> {t("pool.pending")}</span>}
                        >
                          <span class="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success-text"><IconCheck class="mr-1 h-3 w-3" /> {t("pool.approved")}</span>
                        </Show>

                        <Show when={canDelete(question)}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text touch:h-10 touch:w-10"
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuestionToDelete(question);
                            }}
                          >
                            <IconTrash class="h-4 w-4" />
                          </Button>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <InfiniteSentinel
                class="px-4 py-3"
                hasMore={questions.hasMore()}
                loading={questions.loading()}
                onLoadMore={questions.loadMore}
                shown={list().length}
                total={questions.total()}
              />
            </Show>
        </Show>
        </div>
      </DataSection>

      <Show when={askOpen()}>
        <AskQuestionDialog
          onClose={() => setAskOpen(false)}
          onSuccess={() => {
            setAskOpen(false);
            showToast({ title: t("common.saved") });
            navigate({ to: "/questions", search: { status: "pending" }, replace: true });
            refetch();
          }}
        />
      </Show>

      <ConfirmDialog
        open={!!questionToDelete()}
        onOpenChange={(open) => !open && setQuestionToDelete(null)}
        title={t("common.delete")}
        summary={t("questions.deleteConfirm")}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}

function AskQuestionDialog(props: { onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [file, setFile] = createSignal<File | null>(null);
  const [drawing, setDrawing] = createSignal(false);
  const [settings] = createResource(async () => {
    try {
      return await getSettings();
    } catch {
      return null;
    }
  });
  const maxFileBytes = () => maxUploadBytes(settings());

  const setImageFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    setError("");
    if (next.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return;
    }
    setFile(next);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!title().trim() || !body().trim()) return;
    setError("");
    try {
      await postQuestion({ title: title().trim(), body: body().trim() }, file() || undefined);
      props.onSuccess();
    } catch (err: unknown) {
      setError(formatApiError(err));
    }
  };

  return (
    <FormDialog open onOpenChange={(open) => !open && props.onClose()} title={t("pool.ask")} description="">
      <form onSubmit={handleSubmit} class="space-y-4">
        {error() && <ErrorAlert message={error()} />}
        <div class="space-y-2">
          <Label for="q-title">{t("pool.subject")}</Label>
          <Input id="q-title" value={title()} onInput={(e) => setTitle(e.currentTarget.value)} required />
        </div>
        <div class="space-y-2">
          <Label for="q-body">{t("pool.body")}</Label>
          <Textarea id="q-body" value={body()} onInput={(e) => setBody(e.currentTarget.value)} required rows={5} />
        </div>
        <div class="space-y-2">
          <Label>{t("pool.image")}</Label>
          <div class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <Show
              when={!file()}
              fallback={
                <div class="flex flex-col items-center gap-2">
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <IconPhoto class="h-6 w-6 text-primary-text" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-foreground">{file()?.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="z-10 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive-text touch:h-10 touch:w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFile(null);
                      }}
                      aria-label={t("common.remove")}
                    >
                      <IconX class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              }
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <IconPhoto class="h-6 w-6 text-muted-foreground" />
              </div>
              <div class="mt-4 text-center">
                <p class="text-sm font-medium text-foreground">{t("pool.image")}</p>
                <p class="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF · {formatBytes(maxFileBytes())}</p>
              </div>
            </Show>
            <input
              type="file"
              accept="image/*"
              class="absolute inset-0 z-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => setImageFile(e.currentTarget.files?.[0] || null)}
            />
          </div>
          {/* Draw instead of upload: the pad saves a PNG File, so it rides the same upload. */}
          <Button type="button" variant="outline" size="sm" aria-expanded={drawing()} onClick={() => setDrawing((open) => !open)}>
            <IconEdit class="mr-2 h-4 w-4" />
            {t("questions.draw")}
          </Button>
          <Show when={drawing()}>
            <Suspense fallback={<div class="h-88 animate-pulse rounded-lg border bg-muted/20" />}>
              <DrawCanvas
                fileName="question.png"
                onSave={(drawn) => {
                  setImageFile(drawn);
                  if (drawn.size <= maxFileBytes()) setDrawing(false);
                }}
              />
            </Suspense>
          </Show>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={props.onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!title().trim() || !body().trim()}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
