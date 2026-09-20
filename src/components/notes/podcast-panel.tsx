import { For, Show, Suspense, createEffect, createSignal, onCleanup } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getAiCapabilities } from "@/api/ai";
import {
  getPodcastJobById,
  getPodcastJobResultById,
  podcastAudioUrl,
  postPodcastJob,
  postPodcastJobCancel,
} from "@/api/podcast";
import { formatApiError, type PodcastFormat, type PodcastJobArtifacts, type PodcastJobStatus } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconDownload, IconWaveform, IconX } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PodcastHistory } from "@/components/notes/podcast-history";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { cn } from "@/lib/cn";
import { createLivePoll } from "@/lib/create-live-poll";
import { useT } from "@/stores/preferences-context";

const POLL_MS = 2_000;

export function PodcastPanel(props: { noteId: string; active?: boolean; noteTitle?: string }) {
  const t = useT();
  const downloadT = usePodcastDownloadT();
  const [format, setFormat] = createSignal<PodcastFormat>("duz_okuma");
  const [jobId, setJobId] = createSignal("");
  const [status, setStatus] = createSignal<PodcastJobStatus | null>(null);
  const [artifacts, setArtifacts] = createSignal<PodcastJobArtifacts | null>(null);
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [cancelling, setCancelling] = createSignal(false);
  // The service's own estimate, taken from the submit receipt. It is never
  // restated by the status door, so it is shown as the one estimate it is and
  // never recomputed into a countdown the backend did not promise.
  const [etaSecs, setEtaSecs] = createSignal<number | null>(null);
  let generation = 0;

  // Declared before the resource below: its source runs during setup, so a
  // later `const active` would be read in its temporal dead zone.
  const active = () => props.active !== false;
  const [capabilities] = createResource(() => (active() ? getAiCapabilities() : null));
  const storageKey = () => `hezarfen.podcast.${props.noteId}`;
  // A cancelled or finished job is simply not polled again; the ticker below
  // asks whether there is live work rather than being torn down.
  const stopPolling = () => {
    generation += 1;
  };

  const poll = async (id: string, token: number) => {
    try {
      const next = await getPodcastJobById(id);
      if (token !== generation || !active()) return;
      setStatus(next);
      if (next.state === "done") {
        const result = await getPodcastJobResultById(id);
        if (token === generation) setArtifacts(result);
        return;
      }
      if (next.state === "failed") {
        setError(t("podcast.failed"));
      }
    } catch (err) {
      if (token === generation) setError(formatApiError(err));
    }
  };

  createEffect(() => {
    const noteId = props.noteId;
    const enabled = active();
    generation += 1;
    const token = generation;
    setJobId("");
    setStatus(null);
    setArtifacts(null);
    setEtaSecs(null);
    setError("");
    if (!enabled || !noteId || typeof sessionStorage === "undefined") return;
    const stored = sessionStorage.getItem(storageKey());
    if (stored) {
      setJobId(stored);
      void poll(stored, token);
    }
  });

  onCleanup(() => {
    generation += 1;
  });

  const submit = async () => {
    if (submitting()) return;
    generation += 1;
    const token = generation;
    setSubmitting(true);
    setError("");
    setArtifacts(null);
    try {
      const receipt = await postPodcastJob({ source_id: props.noteId, format: format() });
      if (token !== generation) return;
      setJobId(receipt.job_id);
      setStatus({ job_id: receipt.job_id, state: receipt.state, stage: "queued", progress: 0 });
      setEtaSecs(receipt.eta_secs);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(storageKey(), receipt.job_id);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      if (token === generation) setSubmitting(false);
    }
  };

  const cancel = async () => {
    const id = jobId();
    if (!id || cancelling()) return;
    setCancelling(true);
    setError("");
    try {
      await postPodcastJobCancel(id);
      stopPolling();
      setStatus((current) => current ? { ...current, state: "cancelled" } : current);
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(storageKey());
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCancelling(false);
    }
  };

  const progress = () => Math.round(Math.min(1, Math.max(0, status()?.progress ?? 0)) * 100);
  const working = () => ["queued", "running"].includes(status()?.state ?? "");

  // Poll through the shared primitive so a parked tab stops asking and a
  // tab-back is fresh at once — the hand-rolled timeout chain did neither.
  createLivePoll(() => {
    const id = jobId();
    if (id && working() && active()) void poll(id, generation);
  }, POLL_MS);
  const available = () => {
    const current = capabilities();
    if (!current || capabilities.error) return true;
    return current.enabled && current.capabilities.some((item) => item.capability === "podcast.submit" && item.workers > 0);
  };
  const stateLabel = (state: string) => {
    if (state === "queued") return t("podcast.state.queued");
    if (state === "running") return t("podcast.state.running");
    if (state === "done") return t("podcast.state.done");
    if (state === "failed") return t("podcast.state.failed");
    if (state === "cancelled") return t("podcast.state.cancelled");
    return t("podcast.state.running");
  };
  const formatOptions = () => [
    { value: "duz_okuma", label: t("podcast.format.duz_okuma") },
    { value: "tek_ogretici", label: t("podcast.format.tek_ogretici") },
    { value: "ogrenci_hoca", label: t("podcast.format.ogrenci_hoca") },
  ];

  return (
    <Suspense
      fallback={
        <section class="flex min-h-44 items-center justify-center rounded-xl border border-border-line bg-surface-base p-4">
          <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
        </section>
      }
    >
    <section class="space-y-4 rounded-xl border border-border-line bg-surface-base p-4">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
          <IconWaveform class="h-5 w-5" />
        </div>
        <div>
          <h2 class="font-semibold">{t("podcast.title")}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{t("podcast.description")}</p>
        </div>
      </div>

      <Show when={error()}>{(message) => <Alert variant="destructive">{message()}</Alert>}</Show>
      <Show when={!available()}>
        <Alert variant="warning">{t("podcast.unavailable")}</Alert>
      </Show>

      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div class="space-y-1.5">
          <Label for={`podcast-format-${props.noteId}`}>{t("podcast.format")}</Label>
          <Select
            id={`podcast-format-${props.noteId}`}
            class="h-10"
            value={format()}
            disabled={!available() || working() || submitting()}
            onChange={(event) => setFormat(event.currentTarget.value as PodcastFormat)}
          >
            <For each={formatOptions()}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>
        </div>
        <Button type="button" class="h-10 rounded-lg" disabled={!available() || working() || submitting()} onClick={() => void submit()}>
          <IconWaveform class="h-4 w-4" />
          {submitting() ? t("podcast.submitting") : t("podcast.create")}
        </Button>
      </div>

      <Show when={status()}>
        {(current) => (
          <div class="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="font-medium">{stateLabel(current().state)}</span>
              <span class="font-mono text-xs tabular-nums text-muted-foreground">{progress()}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress()} aria-valuemin="0" aria-valuemax="100">
              <div class="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress()}%` }} />
            </div>
            {/* The stage names itself in the service's own vocabulary and is not
                an enumerated set, so only the prefix is translated — the value
                is shown as it came rather than guessed at. */}
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Show when={current().stage}>
                {(stage) => (
                  <span>
                    {t("podcast.stageLabel")} <span class="font-medium text-foreground">{stage()}</span>
                  </span>
                )}
              </Show>
              <Show when={working() && etaSecs() != null}>
                <span class="tabular-nums">{t("podcast.etaHint", { secs: etaSecs()! })}</span>
              </Show>
            </div>
            <Show when={working()}>
              <Button type="button" size="sm" variant="outline" class="rounded-lg" disabled={cancelling()} onClick={() => void cancel()}>
                <IconX class="h-4 w-4" />{t("podcast.cancel")}
              </Button>
            </Show>
          </div>
        )}
      </Show>

      <Show when={artifacts()}>
        {(result) => (
          <div class="space-y-2 rounded-lg border border-success/25 bg-success/5 p-3">
            <p class="text-sm font-medium">{t("podcast.ready")}</p>
            <audio class="w-full" controls preload="metadata" src={podcastAudioUrl(result().job_id)}>
              {t("podcast.audioUnsupported")}
            </audio>
            <a
              href={podcastAudioUrl(result().job_id)}
              download={podcastDownloadFilename(props.noteTitle, downloadT("podcast.download.fallback"))}
              aria-label={downloadT("podcast.download.aria")}
              class={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}
            >
              <IconDownload class="h-4 w-4" />
              {downloadT("podcast.download.label")}
            </a>
          </div>
        )}
      </Show>

      <PodcastHistory
        noteId={props.noteId}
        active={active()}
        refetchKey={status()?.state === "done" ? jobId() : ""}
      />
    </section>
    </Suspense>
  );
}
