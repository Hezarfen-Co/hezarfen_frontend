import { Show } from "solid-js";
import type { PodcastJobSummary } from "@/api/client";
import { PodcastPlayer } from "@/components/notes/podcast-player";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

/** One label/value line of run metadata. */
function MetaRow(props: { label: string; value: string }) {
  return (
    <div class="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt class="shrink-0 text-muted-foreground">{props.label}</dt>
      <dd class="min-w-0 truncate text-right font-medium tabular-nums text-text-strong">{props.value}</dd>
    </div>
  );
}

/**
 * One produced episode, opened from the studio library.
 *
 * Everything here comes off the job row the list already holds — state, the
 * narration the service settled on, when it started and finished, how long the
 * audio runs — plus the audio door, which is addressed by job id. A job that
 * never finished has no player, and says why instead.
 */
export function StudioRunInspector(props: {
  job: PodcastJobSummary | null;
  onOpenChange: (open: boolean) => void;
  /** Resolves the narration's label; unknown formats come back verbatim. */
  formatLabel: (format: string | null) => string;
  stateLabel: (state: string) => string;
  stateVariant: (state: string) => "success" | "destructive" | "secondary" | "warning";
  title: string;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const job = () => props.job;
  const sourceName = () => job()?.source_title ?? job()?.source_id ?? "";

  return (
    <SidePanel
      size="wide"
      open={job() != null}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={sourceName()}
    >
      <Show when={job()}>
        {(row) => (
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant={props.stateVariant(row().state)}>{props.stateLabel(row().state)}</Badge>
              <Show when={props.formatLabel(row().format)}>
                {(label) => <Badge variant="outline">{label()}</Badge>}
              </Show>
            </div>

            <dl class="divide-y divide-border-hairline border-y border-border-hairline">
              <MetaRow label={t("aiStudio.run.source")} value={sourceName()} />
              <MetaRow label={t("aiStudio.run.started")} value={formatDateTime(row().created_at, locale())} />
              <Show when={row().finished_at != null}>
                <MetaRow label={t("aiStudio.run.ended")} value={formatDateTime(row().finished_at!, locale())} />
              </Show>
              <Show when={row().duration_secs != null}>
                <MetaRow
                  label={t("aiStudio.run.length")}
                  value={formatDurationClock(row().duration_secs! * 1_000)}
                />
              </Show>
            </dl>

            <Show when={row().state === "failed" && row().error_code}>
              {(code) => <Alert variant="destructive">{code()}</Alert>}
            </Show>

            <Show
              when={row().state === "done"}
              fallback={<p class="text-sm text-muted-foreground">{t("podcast.history.emptyHint")}</p>}
            >
              <PodcastPlayer jobId={row().job_id} title={sourceName()} durationSecs={row().duration_secs} />
            </Show>
          </div>
        )}
      </Show>
    </SidePanel>
  );
}
