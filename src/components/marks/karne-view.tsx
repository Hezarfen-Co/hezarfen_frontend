import { For, Show } from "solid-js";
import type { KarneReport, Term } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

const formatAverage = (value: number | null) => (value == null ? "—" : value.toFixed(1));

/**
 * One dönem's karne. An archived dönem serves the snapshot the school froze
 * when it closed, so a mark corrected afterwards no longer rewrites what a
 * family already read — the view simply renders whatever the backend serves.
 */
export function KarneView(props: {
  report: KarneReport;
  terms: Term[];
  selectedTerm: string;
  onTermChange: (term: string) => void;
}) {
  const t = useT();
  const verdictLabel = () => {
    const verdict = props.report.verdict;
    if (verdict === "gecti") return t("karne.passed");
    if (verdict === "kaldi") return t("karne.failed");
    return verdict ?? "—";
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0 space-y-1.5">
          <label class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground" for="karne-term">
            {t("terms.term")}
          </label>
          <Select
            id="karne-term"
            wrapperClass="w-56"
            class="h-9 rounded-lg"
            value={props.selectedTerm}
            onChange={(event) => props.onTermChange(event.currentTarget.value)}
          >
            <For each={props.terms}>{(term) => <option value={term.id}>{term.name}</option>}</For>
          </Select>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="rounded-xl border border-border-line bg-surface-base px-4 py-3">
            <p class="text-[11px] text-muted-foreground">{t("karne.average")}</p>
            <p class="mt-0.5 text-2xl font-semibold tabular-nums">{formatAverage(props.report.year_average)}</p>
          </div>
          <div class="rounded-xl border border-border-line bg-surface-base px-4 py-3">
            <p class="text-[11px] text-muted-foreground">{t("karne.verdict")}</p>
            <p class="mt-0.5 text-2xl font-semibold">{verdictLabel()}</p>
          </div>
        </div>
      </div>

      <Show
        when={props.report.instances.length > 0}
        fallback={<DataTableEmpty class="rounded-lg border border-border bg-card py-10">{t("karne.empty")}</DataTableEmpty>}
      >
        <div class="overflow-x-auto rounded-lg border border-border bg-card">
          <table class="w-full text-sm">
            <thead class="border-b border-border/60 text-left text-xs text-muted-foreground">
              <tr>
                <th class="p-3 font-medium">{t("nav.courses")}</th>
                <th class="p-3 font-medium">{t("instances.dersSaati")}</th>
                <th class="p-3 font-medium">{t("marks.courseAvg")}</th>
                <th class="p-3 font-medium">{t("karne.band")}</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.report.instances}>
                {(line) => (
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="min-w-0 p-3 font-medium">{line.course}</td>
                    <td class="mono p-3 tabular-nums text-muted-foreground">{line.ders_saati}</td>
                    <td class="mono p-3 font-semibold tabular-nums">{formatAverage(line.average)}</td>
                    <td class="p-3">
                      <Show when={line.band} fallback="—">
                        {(band) => <Badge variant="outline" class="rounded-full">{band()}</Badge>}
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
