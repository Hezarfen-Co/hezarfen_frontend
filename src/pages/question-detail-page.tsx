import { For, Show, Suspense, createSignal, lazy } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useParams, useRouter } from "@tanstack/solid-router";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getQuestionById, deleteQuestionById, postQuestionApprove, getQuestionImageUrl, getQuestionImageBlob, postQuestionImage, deleteQuestionImage } from "@/api/shared";
import { getSolutions, postSolution, patchSolutionById, deleteSolutionById, getSolutionImageUrl, getSolutionImageBlob, postSolutionImage, deleteSolutionImage } from "@/api/shared";
import { getSettings } from "@/api/settings";
import type { SolutionResponse } from "@/api/shared";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconTrash, IconCheck, IconX, IconEdit, IconMessage, IconPhoto } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { ReplayableImage } from "@/components/ui/replayable-image";
import { personLabel } from "@/lib/person";

import { ErrorAlert } from "@/components/ui/error-alert";
import { showToast } from "@/components/ui/toast";
import { useT } from "@/stores/preferences-context";
import { useAuth } from "@/stores/auth-context";
import { hasMinRole } from "@/lib/roles";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";

// Lazy so the drawing pad rides its own chunk, off the question detail's initial load.
const DrawCanvas = lazy(() => import("@/components/ui/draw-canvas").then((m) => ({ default: m.DrawCanvas })));

// Approve and the actions menu share one row: the toolbar pill, touch-sized
// (h-10) below `sm` and on touch screens, h-8 above. The menu trigger is a
// <button> too, so one rule sizes both.
const HEADER_CONTROLS =
  "flex flex-wrap items-center gap-2 [&_button]:h-10 [&_button]:rounded-full [&_button]:px-3.5 [&_button]:text-[13px] sm:[&_button]:h-8 touch:[&_button]:h-10";

export default function QuestionDetailPage() {
  return (
    <RouteGuard minRole="student">
      <QuestionDetailContent />
    </RouteGuard>
  );
}

function QuestionDetailContent() {
  const t = useT();
  const auth = useAuth();
  const router = useRouter();
  const params = useParams({ from: "/questions/$id" });
  const [error, setError] = createSignal("");

  const [question, { refetch: refetchQ }] = createResource(() => params().id, getQuestionById);
  const [solutions, { refetch: refetchS }] = createResource(
    () => params().id,
    async (id) => (await getSolutions(id, { limit: 100, offset: 0 })).items
  );

  const [offerOpen, setOfferOpen] = createSignal(false);
  const [editSolution, setEditSolution] = createSignal<SolutionResponse | null>(null);
  const [deleteConfirmQ, setDeleteConfirmQ] = createSignal(false);
  const [deleteConfirmS, setDeleteConfirmS] = createSignal<SolutionResponse | null>(null);

  const isModerator = () => hasMinRole(auth.user()?.role, "teacher");
  // The backend lets only the asker touch the image, and only while the
  // question is still pending — approval freezes the content (409).
  const canEditImage = () => {
    const current = question();
    return !!current && current.status === "pending" && current.asker.id === auth.user()?.id;
  };
  const [imageBusy, setImageBusy] = createSignal(false);
  const swapQuestionImage = async (next: File | null) => {
    if (imageBusy()) return;
    setError("");
    setImageBusy(true);
    try {
      if (next) await postQuestionImage(params().id, next);
      else await deleteQuestionImage(params().id);
      await refetchQ();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setImageBusy(false);
    }
  };

  const handleApprove = async () => {
    setError("");
    try {
      await postQuestionApprove(params().id);
      await refetchQ();
      showToast({ title: t("common.saved") });
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleDeleteQ = async () => {
    setError("");
    try {
      await deleteQuestionById(params().id);
      router.navigate({ to: "/questions" });
    } catch (err) {
      setError(formatApiError(err));
      setDeleteConfirmQ(false);
    }
  };

  const handleDeleteS = async (s: SolutionResponse) => {
    setError("");
    try {
      await deleteSolutionById(params().id, s.id);
      await refetchS();
      setDeleteConfirmS(null);
      showToast({ title: t("common.deleted") });
    } catch (err) {
      setError(formatApiError(err));
      setDeleteConfirmS(null);
    }
  };

  return (
    <div class="w-full space-y-6">
      <Suspense fallback={<PageSpinner />}>
        <Show when={question()}>
          {(q) => (
            <>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="mb-2">
                    <Breadcrumbs items={[{ label: t("questions.title"), to: "/questions" }, { label: q().title }]} />
                  </div>
                  <h1 class="text-2xl font-semibold ">{q().title}</h1>
                  <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{personLabel(q().asker)}</span>
                    <span>&bull;</span>
                    <span>{new Date(q().asked_at).toLocaleString()}</span>
                  </div>
                </div>
                <div class={HEADER_CONTROLS}>
                  <Show when={q().status === "pending" && isModerator()}>
                    <Button size="sm" onClick={handleApprove}>
                      <IconCheck class="mr-2 h-4 w-4" />
                      {t("common.approve")}
                    </Button>
                  </Show>
                  <Show when={q().asker.id === auth.user()?.id || isModerator()}>
                    <TableRowActions
                      label={t("common.actions")}
                      actions={[{
                        label: q().status === "pending" && isModerator() ? t("common.reject") : t("common.delete"),
                        icon: <IconTrash class="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => setDeleteConfirmQ(true),
                      }]}
                    />
                  </Show>
                </div>
              </div>

              {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>}

              <div class="rounded-xl border bg-card p-6 shadow-xs">
                <p class="whitespace-pre-wrap text-foreground">{q().body}</p>
                <Show when={q().image}>
                  <div class="mt-4 overflow-hidden rounded-lg border bg-muted/30 p-2">
                    <ReplayableImage
                      fetchBlob={() => getQuestionImageBlob(q().id)}
                      src={getQuestionImageUrl(q().id)}
                      alt="Question Attachment"
                      imgClass="max-h-[500px] w-auto object-contain mx-auto"
                    />
                  </div>
                </Show>
                {/* Attachment stays editable until the question is approved. */}
                <Show when={canEditImage()}>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      as="label"
                      variant="outline"
                      size="sm"
                      class="relative cursor-pointer"
                      aria-disabled={imageBusy()}
                    >
                      <IconPhoto class="mr-2 h-4 w-4" />
                      {q().image ? t("common.edit") : t("pool.image")}
                      <input
                        type="file"
                        accept="image/*"
                        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        disabled={imageBusy()}
                        onChange={(e) => {
                          const picked = e.currentTarget.files?.[0];
                          e.currentTarget.value = "";
                          if (picked) void swapQuestionImage(picked);
                        }}
                      />
                    </Button>
                    <Show when={q().image}>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="text-destructive-text hover:bg-destructive/10"
                        disabled={imageBusy()}
                        onClick={() => void swapQuestionImage(null)}
                      >
                        <IconX class="mr-1 h-4 w-4" />
                        {t("common.remove")}
                      </Button>
                    </Show>
                  </div>
                </Show>
              </div>

              <Show when={q().status === "approved"}>
                <div class="mt-8">
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold ">{t("pool.solutions")}</h2>
                    <Button variant="outline" onClick={() => setOfferOpen(true)}>
                      <IconMessage class="mr-2 h-4 w-4" />
                      {t("pool.offerSolution")}
                    </Button>
                  </div>

                  <div class="space-y-4">
                    <For each={solutions()}>
                      {(sol) => {
                        const isMine = sol.author.id === auth.user()?.id;
                        return (
                          <div class="rounded-xl border bg-card/50 p-5">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2 text-sm font-medium">
                                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary-text">
                                  {sol.author.display_name?.[0] || sol.author.username[0].toUpperCase()}
                                </div>
                                {personLabel(sol.author)}
                                <span class="text-xs font-normal text-muted-foreground ml-2">{new Date(sol.offered_at).toLocaleString()}</span>
                              </div>
                              <Show when={isMine || isModerator()}>
                                <div class="flex items-center gap-1">
                                  <Show when={isMine}>
                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditSolution(sol)} aria-label={t("common.edit")}>
                                      <IconEdit class="h-4 w-4" />
                                    </Button>
                                  </Show>
                                  <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive-text hover:bg-destructive/10" onClick={() => setDeleteConfirmS(sol)} aria-label={t("common.delete")}>
                                    <IconTrash class="h-4 w-4" />
                                  </Button>
                                </div>
                              </Show>
                            </div>
                            <p class="mt-3 whitespace-pre-wrap text-sm text-foreground">{sol.body}</p>
                            <Show when={sol.image}>
                              <div class="mt-3 overflow-hidden rounded-lg border border-border/50 p-2">
                                <ReplayableImage
                                  fetchBlob={() => getSolutionImageBlob(q().id, sol.id)}
                                  src={getSolutionImageUrl(q().id, sol.id)}
                                  alt="Solution Attachment"
                                  imgClass="max-h-[300px] w-auto object-contain mx-auto"
                                />
                              </div>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Show>
            </>
          )}
        </Show>
      </Suspense>

      <ConfirmDialog
        open={deleteConfirmQ()}
        onOpenChange={setDeleteConfirmQ}
        title={t("confirm.deleteTitle")}
        summary={t("confirm.confirmDelete")}
        onConfirm={handleDeleteQ}
        variant="destructive"
      />

      <Show when={deleteConfirmS()} keyed>
        {(sol) => (
          <ConfirmDialog
            open
            onOpenChange={(open) => !open && setDeleteConfirmS(null)}
            title={t("confirm.deleteTitle")}
            summary={t("confirm.confirmDelete")}
            onConfirm={() => handleDeleteS(sol)}
            variant="destructive"
          />
        )}
      </Show>

      <Show when={offerOpen()}>
        <SolutionFormDialog
          questionId={params().id}
          onClose={() => setOfferOpen(false)}
          onSuccess={() => {
            setOfferOpen(false);
            showToast({ title: t("common.saved") });
            refetchS();
          }}
        />
      </Show>

      <Show when={editSolution()} keyed>
        {(sol) => (
          <SolutionFormDialog
            questionId={params().id}
            initialData={sol}
            onClose={() => setEditSolution(null)}
            onSuccess={() => {
              setEditSolution(null);
              showToast({ title: t("common.saved") });
              refetchS();
            }}
          />
        )}
      </Show>
    </div>
  );
}

function SolutionFormDialog(props: { questionId: string; initialData?: SolutionResponse; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [body, setBody] = createSignal(props.initialData?.body || "");
  const [file, setFile] = createSignal<File | null>(null);
  const [removeImage, setRemoveImage] = createSignal(false);
  const [drawing, setDrawing] = createSignal(false);
  /** The already-uploaded attachment, until it is dropped or superseded. */
  const keptImage = () => Boolean(props.initialData?.image) && !removeImage() && !file();
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
    if (!body().trim()) return;
    setError("");
    try {
      if (props.initialData) {
        const solutionId = props.initialData.id;
        await patchSolutionById(props.questionId, solutionId, { body: body().trim() });
        // A re-upload replaces the stored image, so only an untouched picker
        // with the remove flag set needs the explicit DELETE.
        const picked = file();
        if (picked) await postSolutionImage(props.questionId, solutionId, picked);
        else if (removeImage()) await deleteSolutionImage(props.questionId, solutionId);
      } else {
        await postSolution(props.questionId, { body: body().trim() }, file() || undefined);
      }
      props.onSuccess();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <FormDialog open onOpenChange={(open) => !open && props.onClose()} title={props.initialData ? t("common.edit") : t("pool.offerSolution")} description="">
      <form onSubmit={handleSubmit} class="space-y-4">
        {error() && <ErrorAlert message={error()} />}
        <div class="space-y-2">
          <Label for="s-body">{t("pool.body")}</Label>
          <Textarea id="s-body" value={body()} onInput={(e) => setBody(e.currentTarget.value)} required rows={5} />
        </div>
        <div class="space-y-2">
            <Label>{t("pool.image")}</Label>
            {/* Editing keeps the attachment editable too: the backend replaces
                the image on re-upload and drops it on DELETE, so the form must
                offer both rather than silently keeping whatever was there. */}
            <Show when={keptImage()}>
              <div class="flex items-center gap-3 rounded-lg border border-border p-2">
                <ReplayableImage
                  fetchBlob={() => getSolutionImageBlob(props.questionId, props.initialData!.id)}
                  src={getSolutionImageUrl(props.questionId, props.initialData!.id)}
                  alt=""
                  imgClass="max-h-20 w-auto rounded object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="ml-auto text-destructive-text hover:bg-destructive/10"
                  onClick={() => setRemoveImage(true)}
                >
                  <IconX class="mr-1 h-4 w-4" />
                  {t("common.remove")}
                </Button>
              </div>
            </Show>
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
                        class="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive-text z-10"
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
                  fileName="solution.png"
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
          <Button type="submit" disabled={!body().trim()}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
