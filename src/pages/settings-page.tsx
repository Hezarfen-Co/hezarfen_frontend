import { For, Show, Suspense, createEffect, createResource, createSignal } from "solid-js";
import { getSettings } from "@/api/getSettings";
import { patchSettings } from "@/api/patchSettings";
import type { ExamKindSetting, GradeBand } from "@/api/types";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconPlus, IconSave, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

const CORE_ATTENDANCE = new Set(["present", "absent", "late", "excused"]);
const CORE_ATTENDANCE_LABELS = {
  present: "status.present",
  absent: "status.absent",
  late: "status.late",
  excused: "status.excused",
} as const;

function isCoreAttendance(status: string): status is keyof typeof CORE_ATTENDANCE_LABELS {
  return status in CORE_ATTENDANCE_LABELS;
}

export default function SettingsPage() {
  return (
    <RouteGuard minRole="manager">
      <SettingsContent />
    </RouteGuard>
  );
}

function SettingsContent() {
  const t = useT();
  const [settings, { refetch, mutate }] = createResource(() => getSettings());
  const [examKinds, setExamKinds] = createSignal<ExamKindSetting[]>([]);
  const [attendanceStatuses, setAttendanceStatuses] = createSignal<string[]>([]);
  const [gradeBands, setGradeBands] = createSignal<GradeBand[]>([]);
  const [error, setError] = createSignal("");
  const [saved, setSaved] = createSignal(false);
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    const next = settings();
    if (!next) return;
    setExamKinds(next.exam_kinds.map((item) => ({ ...item })));
    setAttendanceStatuses([...next.attendance_statuses]);
    setGradeBands(next.grade_bands.map((item) => ({ ...item })));
  });

  const save = async () => {
    setError("");
    setSaved(false);
    setPending(true);
    try {
      const next = await patchSettings({
        exam_kinds: examKinds().map((item) => ({ name: item.name.trim(), weight: Number(item.weight) })),
        attendance_statuses: attendanceStatuses().map((status) => status.trim()),
        grade_bands: gradeBands().map((band) => ({ min: Number(band.min), label: band.label.trim() })),
      });
      mutate(next);
      setSaved(true);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.admin")}</span>
          <span>/</span>
          <span>{t("settings.title")}</span>
        </div>
        <PageHeader accent="violet" eyebrow={t("nav.admin")} title={t("settings.title")} description={t("settings.subtitle")} />
      </div>

      {error() && <Alert variant="destructive">{error()}</Alert>}
      {saved() && <p class="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{t("settings.saved")}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={settings.error}>
          <Alert variant="destructive">{formatApiError(settings.error)}</Alert>
        </Show>
        <Show when={settings()}>
          <div class="grid gap-5 xl:grid-cols-3">
            <section class="data-shell space-y-4 p-4">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("settings.examKinds")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{t("settings.examKindsHelp")}</p>
              </div>
              <div class="space-y-2">
                <For each={examKinds()}>
                  {(item, index) => (
                    <div class="grid grid-cols-[minmax(0,1fr)_5rem_2.25rem] gap-2">
                      <Input
                        aria-label={t("settings.name")}
                        value={item.name}
                        onInput={(e) => setExamKinds((rows) => rows.map((row, i) => (i === index() ? { ...row, name: e.currentTarget.value } : row)))}
                      />
                      <Input
                        aria-label={t("settings.weight")}
                        type="number"
                        min={1}
                        max={100}
                        value={item.weight}
                        onInput={(e) => setExamKinds((rows) => rows.map((row, i) => (i === index() ? { ...row, weight: Number(e.currentTarget.value) } : row)))}
                      />
                      <Button type="button" variant="ghost" size="icon" class="rounded-sm" onClick={() => setExamKinds((rows) => rows.filter((_, i) => i !== index()))}>
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </For>
              </div>
              <Button type="button" variant="outline" class="rounded-sm" onClick={() => setExamKinds((rows) => [...rows, { name: "", weight: 1 }])}>
                <IconPlus class="h-4 w-4" />
                {t("settings.addRow")}
              </Button>
            </section>

            <section class="data-shell space-y-4 p-4">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("settings.attendanceStatuses")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{t("settings.attendanceHelp")}</p>
              </div>
              <div class="space-y-2">
                <For each={attendanceStatuses()}>
                  {(status, index) => (
                    <div class="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                      <Show
                        when={isCoreAttendance(status)}
                        fallback={
                          <Input
                            aria-label={t("settings.status")}
                            value={status}
                            onInput={(e) => setAttendanceStatuses((rows) => rows.map((row, i) => (i === index() ? e.currentTarget.value : row)))}
                          />
                        }
                      >
                        <div class="flex h-9 items-center rounded-sm border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                          {t(CORE_ATTENDANCE_LABELS[status as keyof typeof CORE_ATTENDANCE_LABELS])}
                        </div>
                      </Show>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="rounded-sm"
                        disabled={CORE_ATTENDANCE.has(status)}
                        onClick={() => setAttendanceStatuses((rows) => rows.filter((_, i) => i !== index()))}
                      >
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </For>
              </div>
              <Button type="button" variant="outline" class="rounded-sm" onClick={() => setAttendanceStatuses((rows) => [...rows, ""])}>
                <IconPlus class="h-4 w-4" />
                {t("settings.addRow")}
              </Button>
            </section>

            <section class="data-shell space-y-4 p-4">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("settings.gradeBands")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{t("settings.gradeBandsHelp")}</p>
              </div>
              <div class="space-y-2">
                <For each={gradeBands()}>
                  {(band, index) => (
                    <div class="grid grid-cols-[5rem_minmax(0,1fr)_2.25rem] gap-2">
                      <Input
                        aria-label={t("settings.min")}
                        type="number"
                        min={0}
                        max={100}
                        value={band.min}
                        onInput={(e) => setGradeBands((rows) => rows.map((row, i) => (i === index() ? { ...row, min: Number(e.currentTarget.value) } : row)))}
                      />
                      <Input
                        aria-label={t("settings.label")}
                        value={band.label}
                        onInput={(e) => setGradeBands((rows) => rows.map((row, i) => (i === index() ? { ...row, label: e.currentTarget.value } : row)))}
                      />
                      <Button type="button" variant="ghost" size="icon" class="rounded-sm" onClick={() => setGradeBands((rows) => rows.filter((_, i) => i !== index()))}>
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </For>
              </div>
              <Button type="button" variant="outline" class="rounded-sm" onClick={() => setGradeBands((rows) => [...rows, { min: 0, label: "" }])}>
                <IconPlus class="h-4 w-4" />
                {t("settings.addRow")}
              </Button>
            </section>
          </div>

          <div class="flex justify-end">
            <Button type="button" class="rounded-sm" disabled={pending()} onClick={() => void save()}>
              <IconSave class="h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
