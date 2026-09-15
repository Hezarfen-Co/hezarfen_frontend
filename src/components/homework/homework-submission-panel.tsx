import { For, Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { ApiError, formatApiError } from "@/api/client";
import {
  deleteHomeworkSubmission,
  deleteHomeworkSubmissionFile,
  getHomeworkResult,
  getHomeworkSubmission,
  getHomeworkSubmissionFileUrl,
  postHomeworkSubmission,
  postHomeworkSubmissionFile,
} from "@/api/homework";
import { getSettings } from "@/api/settings";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconDownload, IconTrash, IconUploadCloud } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { fileTypeMeta } from "@/lib/file-type";
import { formatDateTime } from "@/lib/format";
import { formatBytes, maxUploadBytes } from "@/lib/upload-limits";
import { usePreferences, useT } from "@/stores/preferences-context";

export function HomeworkSubmissionPanel(props: { homeworkId: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const [text, setText] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [withdrawOpen, setWithdrawOpen] = createSignal(false);
  let input: HTMLInputElement | undefined;

  const [settings] = createResource(() => getSettings().catch(() => null));
  const [submission, { refetch: refetchSubmission }] = createResource(
    () => props.homeworkId,
    async (id) => {
      try {
        return await getHomeworkSubmission(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );
  const [result] = createResource(
    () => props.homeworkId,
    async (id) => {
      try {
        return await getHomeworkResult(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );
  const maxFileBytes = () => maxUploadBytes(settings());
  const hasFiles = () => (submission()?.files.length ?? 0) > 0;

  createEffect(() => setText(submission()?.text ?? ""));

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await postHomeworkSubmission(props.homeworkId, { text: text().trim() || null });
      await refetchSubmission();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (file.size > maxFileBytes()) {
      setError(t("notes.fileTooLarge", { size: formatBytes(maxFileBytes()) }));
      return;
    }
    setPending(true);
    try {
      await postHomeworkSubmissionFile(props.homeworkId, file);
      await refetchSubmission();
      if (input) input.value = "";
      setFlash(t("homework.fileUploaded"));
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  const removeFile = async (fileId: string) => {
    setError("");
    setPending(true);
    try {
      await deleteHomeworkSubmissionFile(props.homeworkId, fileId);
      await refetchSubmission();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };

  // The backend refuses a withdrawal once a grade exists (409), so the button
  // only shows while there is a submission and no result on it.
  const canWithdraw = () => submission() != null && result() == null;
  const withdraw = async () => {
    setError("");
    setPending(true);
    try {
      await deleteHomeworkSubmission(props.homeworkId);
      await refetchSubmission();
      setText("");
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
      setWithdrawOpen(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === "done") return t("homework.status.done");
    if (status === "incomplete") return t("homework.status.incomplete");
    if (status === "missing") return t("homework.status.missing");
    return status;
  };

  return (
    <section class="data-shell space-y-4 p-5">
      <div>
        <h2 class="text-lg font-semibold">{t("homework.submit")}</h2>
        <p class="mt-1 text-sm text-text-subtle">{t("homework.submitHelp")}</p>
      </div>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Suspense fallback={<PageSpinner />}>
        <Show when={result()}>
          {(row) => (
            <div class="rounded-xl border border-border-line bg-surface-tint p-3 text-sm">
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline" class="rounded-full">{statusLabel(row().status)}</Badge>
                <Show when={row().mark != null}>
                  <Badge variant="secondary" class="rounded-full">{t("form.mark")}: {row().mark}</Badge>
                </Show>
              </div>
            </div>
          )}
        </Show>
        <form class="space-y-3" onSubmit={(event) => void save(event)}>
          <RichTextEditor value={text()} onChange={setText} placeholder={t("homework.answerPlaceholder")} minHeight="min-h-32" />
          <div class="flex flex-wrap items-center gap-2">
            <Button type="submit" class="rounded-lg" disabled={pending()}>{t("common.save")}</Button>
            <Show when={canWithdraw()}>
              <Button
                type="button"
                variant="ghost"
                class="rounded-lg text-destructive hover:bg-destructive/10"
                disabled={pending()}
                onClick={() => setWithdrawOpen(true)}
              >
                <IconTrash class="h-4 w-4" />
                {t("homework.withdraw")}
              </Button>
            </Show>
          </div>
        </form>
        <div class={cn("rounded-xl border border-border-line bg-surface-base p-3", hasFiles() && "space-y-3")}>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium">{t("notes.files")}</p>
              <Show when={hasFiles()}>
                <Badge variant="secondary" class="rounded-full">{submission()!.files.length}</Badge>
              </Show>
            </div>
            <input ref={(el) => { input = el; }} type="file" class="hidden" disabled={pending()} onChange={(event) => void upload(event.currentTarget.files?.[0])} />
            <Button type="button" size="sm" variant="outline" class="rounded-lg" disabled={pending()} onClick={() => input?.click()}>
              <IconUploadCloud class="h-4 w-4" />
              {t("notes.addFile")}
            </Button>
          </div>
          {/* Collapsed to just the header row above until a file exists — the list opens the moment one is added. */}
          <Show when={hasFiles()}>
            <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <For each={submission()?.files ?? []}>
                {(file) => {
                  const meta = fileTypeMeta(file);
                  return (
                    <li class="flex items-center gap-2 rounded-xl border border-border-hairline bg-surface-base px-2.5 py-2 text-sm">
                      <span class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-hairline ${meta.class}`}>{meta.icon}</span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-medium">{file.name}</p>
                        <p class="text-xs text-text-subtle">{formatBytes(file.size)}</p>
                      </div>
                      <a href={getHomeworkSubmissionFileUrl(props.homeworkId, file.id)} download={file.name}>
                        <Button type="button" size="icon" variant="ghost" class="h-7 w-7 rounded-lg" title={t("notes.downloadFile")}>
                          <IconDownload class="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button type="button" size="icon" variant="ghost" class="h-7 w-7 rounded-lg text-destructive hover:text-destructive" disabled={pending()} title={t("common.delete")} onClick={() => void removeFile(file.id)}>
                        <IconTrash class="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                }}
              </For>
            </ul>
            <Show when={submission()}>
              {(row) => (
                <p class="text-xs text-text-subtle">
                  {t("homework.submittedAt")}: {formatDateTime(row().updated_at, locale())}
                  <Show when={row().late}> · {t("homework.late")}</Show>
                </p>
              )}
            </Show>
          </Show>
        </div>
      </Suspense>

      <ConfirmDialog
        open={withdrawOpen()}
        onOpenChange={setWithdrawOpen}
        title={t("homework.withdraw")}
        summary={t("homework.withdrawHint")}
        onConfirm={() => void withdraw()}
        variant="destructive"
      />
    </section>
  );
}
