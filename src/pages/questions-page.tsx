import { For, Show, Suspense, createEffect, createResource, createSignal, lazy } from "solid-js";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/solid-router";
import { getQuestions, postQuestion, deleteQuestionById } from "@/api/shared";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
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
import { useT } from "@/stores/preferences-context";
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
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false });

  const statusFilter = () => ((searchParams() as any).status === "pending" ? "pending" : "approved");

  const [list, { refetch }] = createResource(
    () => ({ status: statusFilter(), limit: 50, offset: 0 }),
    async (params) => (await getQuestions(params.status as "pending" | "approved", params)).items
  );

  const [askOpen, setAskOpen] = createSignal(location().searchStr.includes("action=new"));
  const [questionToDelete, setQuestionToDelete] = createSignal<any | null>(null);

  createEffect(() => {
    if (location().searchStr.includes("action=new")) {
      setAskOpen(true);
    }
  });

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
      <PageHeader
        accent="violet"
        eyebrow={t("nav.group.community")}
        title={t("pool.title")}
        description={t("pool.subtitle")}
        actions={
          <Show when={auth.user()?.role === "student"}>
            <Button type="button" size="sm" class="rounded-lg" onClick={() => setAskOpen(true)}>
              <IconPlus class="h-4 w-4" />
              {t("pool.ask")}
            </Button>
          </Show>
        }
      />

      <div class="flex gap-2 border-b">
        <Link
          to="/questions"
          search={{ status: "approved" }}
          class={cn("pb-2 text-sm font-medium transition-colors hover:text-foreground", statusFilter() === "approved" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground")}
        >
          {t("pool.approved")}
        </Link>
        <Link
          to="/questions"
          search={{ status: "pending" }}
          class={cn("ml-4 pb-2 text-sm font-medium transition-colors hover:text-foreground", statusFilter() === "pending" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground")}
        >
          {t("pool.pending")}
        </Link>
      </div>

      <div class="data-shell">
        <Suspense fallback={<PageSpinner />}>
          <Show when={list()}>
            <Show when={list()!.length > 0} fallback={<EmptyState title={t("pool.noQuestions")} />}>
              <div class="divide-y divide-border">
                <For each={list()}>
                  {(question) => (
                    <div class="group flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                      <Link to="/questions/$id" params={{ id: question.id }} class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">{question.title}</h3>
                          <Show when={question.image}>
                            <IconPhoto class="h-4 w-4 text-muted-foreground" />
                          </Show>
                        </div>
                        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.body}</p>
                        <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span class="flex items-center gap-1">
                            <div class="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
                              {question.asker.display_name?.[0] || question.asker.username[0].toUpperCase()}
                            </div>
                            {personLabel(question.asker)}
                          </span>
                          <span>&bull;</span>
                          <span>{new Date(question.asked_at).toLocaleDateString()}</span>
                        </div>
                      </Link>

                      <div class="mt-2 flex items-center gap-3 sm:mt-0 sm:pl-4 shrink-0">
                        <Show
                          when={question.status === "approved"}
                          fallback={<span class="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"><IconClock class="mr-1 h-3 w-3" /> {t("pool.pending")}</span>}
                        >
                          <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"><IconCheck class="mr-1 h-3 w-3" /> {t("pool.approved")}</span>
                        </Show>

                        <Show when={canDelete(question)}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg"
                            title={t("common.delete")}
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
            </Show>
          </Show>
        </Suspense>
      </div>

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
        description="Bu soruyu silmek istediğinizden emin misiniz?"
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
                    <IconPhoto class="h-6 w-6 text-primary" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-foreground">{file()?.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFile(null);
                      }}
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
            <Suspense fallback={<div class="h-[22rem] animate-pulse rounded-lg border bg-muted/20" />}>
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
