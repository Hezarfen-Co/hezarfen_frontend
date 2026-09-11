import { For, Index, Show, Suspense, createEffect, createResource, createSignal } from "solid-js";
import { getSettings } from "@/api/settings";
import { patchSettings } from "@/api/settings";
import { getLimits } from "@/api/limits";
import { getModules, getModulesCatalog } from "@/api/modules";
import type { ExamKindSetting, GradeBand, MealSlot, SchoolSettings } from "@/api/client";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { dirtySettingsPatch, minuteToUtcTime, utcTimeToMinute } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

const CORE_ATTENDANCE = new Set(["present", "absent", "late", "excused"]);
const CORE_ATTENDANCE_LABELS = {
  present: "status.present",
  absent: "status.absent",
  late: "status.late",
  excused: "status.excused",
} as const;

const BYTES_PER_MIB = 1024 * 1024;

// Neutralize the Tabs.Content card so it is just a container — the sections
// inside already carry their own `data-shell` surfaces.
const TAB_PANEL = "border-0 bg-transparent p-0 shadow-none space-y-4";

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
  const [modulesInfo, { refetch: refetchModules }] = createResource(async () => {
    const [mine, catalog] = await Promise.all([getModules(), getModulesCatalog()]);
    return { mine, catalog };
  });
  const [examKinds, setExamKinds] = createSignal<ExamKindSetting[]>([]);
  const [attendanceStatuses, setAttendanceStatuses] = createSignal<string[]>([]);
  const [gradeBands, setGradeBands] = createSignal<GradeBand[]>([]);
  const [maxFileMiB, setMaxFileMiB] = createSignal("5");
  const [chatbotHistoryTurns, setChatbotHistoryTurns] = createSignal("10");
  const [maxChatbotThreads, setMaxChatbotThreads] = createSignal("50");
  const [maxChatbotMessageLen, setMaxChatbotMessageLen] = createSignal("4000");
  const [mealSlots, setMealSlots] = createSignal<MealSlot[]>([]);
  const [dietaryTags, setDietaryTags] = createSignal<string[]>([]);
  const [mealCutoff, setMealCutoff] = createSignal("");
  const [error, setError] = createSignal("");
  const [saved, setSaved] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [baseline, setBaseline] = createSignal<SchoolSettings | null>(null);
  const [tab, setTab] = createSignal("assessment");
  const [limits, { refetch: refetchLimits }] = createResource(() => getLimits());
  let savedTimer: number | undefined;

  const snapshot = (): SchoolSettings => ({
      exam_kinds: examKinds(),
      attendance_statuses: attendanceStatuses(),
      grade_bands: gradeBands(),
      max_file_bytes: Math.round(Number(maxFileMiB()) * BYTES_PER_MIB),
      chatbot_history_turns: Number(chatbotHistoryTurns()),
      max_chatbot_threads: Number(maxChatbotThreads()),
      max_chatbot_message_len: Number(maxChatbotMessageLen()),
      meal_slots: mealSlots(),
      dietary_tags: dietaryTags(),
      meal_cancel_cutoff_minutes: mealCutoff() === "" ? null : Number(mealCutoff()),
    });

  createEffect(() => {
    const next = settings();
    if (!next) return;
    const fileBytes = next.max_file_bytes ?? 5 * BYTES_PER_MIB;
    setExamKinds(next.exam_kinds.map((item) => ({ ...item })));
    setAttendanceStatuses([...next.attendance_statuses]);
    setGradeBands(next.grade_bands.map((item) => ({ ...item })));
    setMaxFileMiB(String(Math.round((fileBytes / BYTES_PER_MIB) * 10) / 10));
    setChatbotHistoryTurns(String(next.chatbot_history_turns));
    setMaxChatbotThreads(String(next.max_chatbot_threads));
    setMaxChatbotMessageLen(String(next.max_chatbot_message_len));
    setMealSlots(next.meal_slots.map((slot) => ({ ...slot })));
    setDietaryTags([...next.dietary_tags]);
    setMealCutoff(next.meal_cancel_cutoff_minutes == null ? "" : String(next.meal_cancel_cutoff_minutes));
    setBaseline({ ...next, max_file_bytes: fileBytes });
  });

  const dirty = () => baseline() !== null && JSON.stringify(snapshot()) !== JSON.stringify(baseline());

  createEffect(() => {
    if (dirty() && saved()) setSaved(false);
  });

  const save = async () => {
    setError("");
    setSaved(false);
    const maxFileBytes = Math.round(Number(maxFileMiB()) * BYTES_PER_MIB);
    if (!Number.isFinite(maxFileBytes)) {
      setError(t("settings.maxFileSizeInvalid"));
      return;
    }
    // A meal-slot name becomes a URL path segment on the backend, so these
    // characters are rejected there — but a name already on the saved list is
    // grandfathered in, so only newly-typed names are blocked client-side.
    const savedSlotNames = new Set((baseline()?.meal_slots ?? []).map((slot) => slot.name));
    const badSlot = mealSlots().find((slot) => {
      const name = slot.name.trim();
      return name !== "" && /[/\\?#%]/.test(name) && !savedSlotNames.has(name);
    });
    if (badSlot) {
      setError(t("settings.mealSlotNameInvalid"));
      return;
    }
    setPending(true);
    try {
      const before = baseline();
      if (!before) return;
      const current = {
        ...snapshot(),
        exam_kinds: examKinds().map((item) => ({ name: item.name.trim(), weight: Number(item.weight) })),
        attendance_statuses: attendanceStatuses().map((status) => status.trim()),
        grade_bands: gradeBands().map((band) => ({ min: Number(band.min), label: band.label.trim() })),
        max_file_bytes: maxFileBytes,
        meal_slots: mealSlots().map((slot) => ({ ...slot, name: slot.name.trim() })),
        dietary_tags: dietaryTags().map((tag) => tag.trim()),
      };
      const next = await patchSettings(dirtySettingsPatch(before, current));
      mutate(next);
      setBaseline(next);
      setSaved(true);
      if (savedTimer) window.clearTimeout(savedTimer);
      savedTimer = window.setTimeout(() => setSaved(false), 3000);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader
        eyebrow={t("nav.admin")}
        title={t("settings.title")}
        description={t("settings.subtitle")}
        actions={
          <div class="flex flex-wrap items-center gap-2">
            <Show when={dirty()}>
              <span class="text-xs text-muted-foreground">{t("settings.unsaved")}</span>
            </Show>
            <Show when={saved() && !dirty()}>
              <span class="text-xs text-emerald-700 dark:text-emerald-300">{t("settings.saved")}</span>
            </Show>
            <Button
              type="button"
              size="sm"
              class="min-w-30 rounded-lg"
              disabled={pending() || !dirty()}
              onClick={() => void save()}
            >
              {t("common.save")}
            </Button>
          </div>
        }
      />

      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Show when={limits.error}>
        <ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} />
      </Show>

      <Tabs value={tab()} onChange={setTab}>
        <TabsList>
          <TabsTrigger value="assessment">{t("settings.tabAssessment")}</TabsTrigger>
          <TabsTrigger value="meals">{t("settings.tabMeals")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.tabSystem")}</TabsTrigger>
        </TabsList>

        <Suspense fallback={<PageSpinner />}>
          <Show when={settings.error}>
            <ErrorAlert message={formatApiError(settings.error)} onRetry={() => void refetch()} />
          </Show>

          <TabsContent value="assessment" class={TAB_PANEL}>
            <Show when={settings()}>
              <div class="grid gap-4 xl:grid-cols-3">
                <section class="data-shell flex flex-col overflow-hidden">
                  <header class="border-b border-border/70 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h2 class="text-base font-semibold">{t("settings.examKinds")}</h2>
                        <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("settings.examKindsHelp")}</p>
                      </div>
                      <Badge variant="secondary" class="mono shrink-0 rounded-sm tabular-nums">
                        {examKinds().length}
                      </Badge>
                    </div>
                  </header>

                  <div class="flex-1 space-y-2 p-4">
                    <div class="grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>{t("settings.name")}</span>
                      <span class="text-center">{t("settings.weight")}</span>
                      <span class="sr-only">{t("common.actions")}</span>
                    </div>
                    <Show
                      when={examKinds().length > 0}
                      fallback={<EmptyRows label={t("settings.empty")} />}
                    >
                      <Index each={examKinds()}>
                        {(item, index) => (
                          <div class="grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-2xs">
                            <Input
                              aria-label={t("settings.name")}
                              class="h-9 rounded-md border-0 bg-transparent shadow-none focus-visible:ring-1"
                              value={item().name}
                              placeholder={t("settings.name")}
                              onInput={(e) =>
                                setExamKinds((rows) =>
                                  rows.map((row, i) => (i === index ? { ...row, name: e.currentTarget.value } : row)),
                                )
                              }
                            />
                            <Input
                              aria-label={t("settings.weight")}
                              class="h-9 rounded-md border-0 bg-muted/40 text-center font-mono shadow-none focus-visible:ring-1"
                              type="number"
                              min={1}
                              max={100}
                              value={item().weight}
                              onInput={(e) =>
                                setExamKinds((rows) =>
                                  rows.map((row, i) =>
                                    i === index ? { ...row, weight: Number(e.currentTarget.value) } : row,
                                  ),
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive"
                              aria-label={t("common.delete")}
                              onClick={() => setExamKinds((rows) => rows.filter((_, i) => i !== index))}
                            >
                              <IconTrash class="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Index>
                    </Show>
                  </div>

                  <footer class="border-t border-border/70 px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full rounded-lg"
                      onClick={() => setExamKinds((rows) => [...rows, { name: "", weight: 1 }])}
                    >
                      <IconPlus class="h-4 w-4" />
                      {t("settings.addRow")}
                    </Button>
                  </footer>
                </section>

                <section class="data-shell flex flex-col overflow-hidden">
                  <header class="border-b border-border/70 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h2 class="text-base font-semibold">{t("settings.attendanceStatuses")}</h2>
                        <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("settings.attendanceHelp")}</p>
                      </div>
                      <Badge variant="secondary" class="mono shrink-0 rounded-sm tabular-nums">
                        {attendanceStatuses().length}
                      </Badge>
                    </div>
                  </header>

                  <div class="flex-1 space-y-2 p-4">
                    <div class="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>{t("settings.status")}</span>
                      <span class="sr-only">{t("common.actions")}</span>
                    </div>
                    <Show
                      when={attendanceStatuses().length > 0}
                      fallback={<EmptyRows label={t("settings.empty")} />}
                    >
                      <Index each={attendanceStatuses()}>
                        {(status, index) => {
                          const meta = () => getAttendanceStatusMeta(status());
                          return (
                            <div class="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-2xs">
                              <Show
                                when={isCoreAttendance(status())}
                                fallback={
                                  <Input
                                    aria-label={t("settings.status")}
                                    class="h-9 rounded-md border-0 bg-transparent shadow-none focus-visible:ring-1"
                                    value={status()}
                                    placeholder={t("settings.status")}
                                    onInput={(e) =>
                                      setAttendanceStatuses((rows) =>
                                        rows.map((row, i) => (i === index ? e.currentTarget.value : row)),
                                      )
                                    }
                                  />
                                }
                              >
                                <div class="flex h-9 items-center gap-2 px-1">
                                  <span
                                    class={cn(
                                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                      meta()?.class ?? "border-border bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {t(CORE_ATTENDANCE_LABELS[status() as keyof typeof CORE_ATTENDANCE_LABELS])}
                                  </span>
                                  <span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    {t("settings.locked")}
                                  </span>
                                </div>
                              </Show>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive disabled:opacity-30"
                                aria-label={t("common.delete")}
                                disabled={CORE_ATTENDANCE.has(status())}
                                onClick={() => setAttendanceStatuses((rows) => rows.filter((_, i) => i !== index))}
                              >
                                <IconTrash class="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        }}
                      </Index>
                    </Show>
                  </div>

                  <footer class="border-t border-border/70 px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full rounded-lg"
                      onClick={() => setAttendanceStatuses((rows) => [...rows, ""])}
                    >
                      <IconPlus class="h-4 w-4" />
                      {t("settings.addRow")}
                    </Button>
                  </footer>
                </section>

                <section class="data-shell flex flex-col overflow-hidden">
                  <header class="border-b border-border/70 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h2 class="text-base font-semibold">{t("settings.gradeBands")}</h2>
                        <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("settings.gradeBandsHelp")}</p>
                      </div>
                      <Badge variant="secondary" class="mono shrink-0 rounded-sm tabular-nums">
                        {gradeBands().length}
                      </Badge>
                    </div>
                  </header>

                  <div class="flex-1 space-y-2 p-4">
                    <div class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>{t("settings.min")}</span>
                      <span>{t("settings.label")}</span>
                      <span class="sr-only">{t("common.actions")}</span>
                    </div>
                    <Show when={gradeBands().length > 0} fallback={<EmptyRows label={t("settings.empty")} />}>
                      <Index each={gradeBands()}>
                        {(band, index) => (
                          <div class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.25rem] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-2xs">
                            <Input
                              aria-label={t("settings.min")}
                              class="h-9 rounded-md border-0 bg-muted/40 text-center font-mono shadow-none focus-visible:ring-1"
                              type="number"
                              min={0}
                              max={100}
                              value={band().min}
                              onInput={(e) =>
                                setGradeBands((rows) =>
                                  rows.map((row, i) =>
                                    i === index ? { ...row, min: Number(e.currentTarget.value) } : row,
                                  ),
                                )
                              }
                            />
                            <Input
                              aria-label={t("settings.label")}
                              class="h-9 rounded-md border-0 bg-transparent shadow-none focus-visible:ring-1"
                              value={band().label}
                              placeholder={t("settings.label")}
                              onInput={(e) =>
                                setGradeBands((rows) =>
                                  rows.map((row, i) =>
                                    i === index ? { ...row, label: e.currentTarget.value } : row,
                                  ),
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive"
                              aria-label={t("common.delete")}
                              onClick={() => setGradeBands((rows) => rows.filter((_, i) => i !== index))}
                            >
                              <IconTrash class="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Index>
                    </Show>
                  </div>

                  <footer class="border-t border-border/70 px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full rounded-lg"
                      onClick={() => setGradeBands((rows) => [...rows, { min: 0, label: "" }])}
                    >
                      <IconPlus class="h-4 w-4" />
                      {t("settings.addRow")}
                    </Button>
                  </footer>
                </section>
              </div>
            </Show>
          </TabsContent>

          <TabsContent value="meals" class={TAB_PANEL}>
            <Show when={settings()}>
              <section class="data-shell p-4">
                <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
                  <div>
                    <h2 class="text-base font-semibold">{t("settings.foodPolicy")}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">{t("settings.foodPolicyHelp")}</p>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="meal-cutoff" class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("settings.mealCutoff")}</Label>
                    <Input id="meal-cutoff" class="h-10 rounded-md text-right font-mono" type="number" min={0} max={limits()?.meal.max_cancel_cutoff_minutes} value={mealCutoff()} placeholder={t("settings.noCutoff")} onInput={(e) => setMealCutoff(e.currentTarget.value)} />
                  </div>
                </div>
              </section>

              <div class="grid gap-4 xl:grid-cols-2">
                <section class="data-shell flex flex-col overflow-hidden">
                  <header class="border-b border-border/70 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <h2 class="text-base font-semibold">{t("settings.mealSlot")}</h2>
                      <Badge variant="secondary" class="mono shrink-0 rounded-sm tabular-nums">{mealSlots().length}</Badge>
                    </div>
                  </header>
                  <div class="flex-1 space-y-2 p-4">
                    <Show when={mealSlots().length > 0} fallback={<EmptyRows label={t("settings.empty")} />}>
                      <div class="grid grid-cols-[minmax(0,1fr)_7rem_2.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <span>{t("settings.name")}</span>
                        <span class="text-center">{t("settings.servingTimeUtc")}</span>
                        <span class="sr-only">{t("common.actions")}</span>
                      </div>
                      <Index each={mealSlots()}>
                        {(slot, index) => (
                          <div class="grid grid-cols-[minmax(0,1fr)_7rem_2.25rem] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-2xs">
                            <Input
                              aria-label={t("settings.mealSlot")}
                              class="h-9 rounded-md border-0 bg-transparent shadow-none focus-visible:ring-1"
                              maxlength={limits()?.settings.max_item_len}
                              value={slot().name}
                              placeholder={t("settings.name")}
                              onInput={(e) => setMealSlots((rows) => rows.map((row, i) => i === index ? { ...row, name: e.currentTarget.value } : row))}
                            />
                            <Input
                              aria-label={t("settings.servingTimeUtc")}
                              class="h-9 rounded-md border-0 bg-muted/40 text-center font-mono shadow-none focus-visible:ring-1"
                              type="time"
                              value={minuteToUtcTime(slot().serving_minute)}
                              onInput={(e) => setMealSlots((rows) => rows.map((row, i) => i === index ? { ...row, serving_minute: utcTimeToMinute(e.currentTarget.value) } : row))}
                            />
                            <Button type="button" variant="ghost" size="icon" class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive" aria-label={t("common.delete")} onClick={() => setMealSlots((rows) => rows.filter((_, i) => i !== index))}><IconTrash class="h-4 w-4" /></Button>
                          </div>
                        )}
                      </Index>
                    </Show>
                  </div>
                  <footer class="border-t border-border/70 px-4 py-3">
                    <Button type="button" variant="outline" size="sm" class="w-full rounded-lg" onClick={() => setMealSlots((rows) => [...rows, { name: "", serving_minute: null }])}><IconPlus class="h-4 w-4" />{t("settings.addMealSlot")}</Button>
                  </footer>
                </section>

                <section class="data-shell flex flex-col overflow-hidden">
                  <header class="border-b border-border/70 px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                      <h2 class="text-base font-semibold">{t("settings.dietaryTags")}</h2>
                      <Badge variant="secondary" class="mono shrink-0 rounded-sm tabular-nums">{dietaryTags().length}</Badge>
                    </div>
                  </header>
                  <div class="flex-1 space-y-2 p-4">
                    <Show when={dietaryTags().length > 0} fallback={<EmptyRows label={t("settings.empty")} />}>
                      <Index each={dietaryTags()}>
                        {(tag, index) => (
                          <div class="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-2xs">
                            <Input
                              aria-label={t("settings.dietaryTags")}
                              class="h-9 rounded-md border-0 bg-transparent shadow-none focus-visible:ring-1"
                              maxlength={limits()?.settings.max_item_len}
                              value={tag()}
                              placeholder={t("settings.dietaryTags")}
                              onInput={(e) => setDietaryTags((rows) => rows.map((row, i) => i === index ? e.currentTarget.value : row))}
                            />
                            <Button type="button" variant="ghost" size="icon" class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive" aria-label={t("common.delete")} onClick={() => setDietaryTags((rows) => rows.filter((_, i) => i !== index))}><IconTrash class="h-4 w-4" /></Button>
                          </div>
                        )}
                      </Index>
                    </Show>
                  </div>
                  <footer class="border-t border-border/70 px-4 py-3">
                    <Button type="button" variant="outline" size="sm" class="w-full rounded-lg" onClick={() => setDietaryTags((rows) => [...rows, ""])}><IconPlus class="h-4 w-4" />{t("settings.addDietaryTag")}</Button>
                  </footer>
                </section>
              </div>
            </Show>
          </TabsContent>

          <TabsContent value="system" class={TAB_PANEL}>
            <Show when={settings()}>
              <section class="data-shell p-4">
                <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
                  <div>
                    <h2 class="text-base font-semibold">{t("settings.maxFileSize")}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">{t("settings.maxFileSizeHelp")}</p>
                  </div>
                  <Input
                    aria-label={t("settings.maxFileSize")}
                    class="h-10 rounded-md text-right font-mono"
                    type="number"
                    min={(limits()?.file.min_max_file_bytes ?? 1024) / BYTES_PER_MIB}
                    max={(limits()?.file.max_max_file_bytes ?? 25 * BYTES_PER_MIB) / BYTES_PER_MIB}
                    step={0.1}
                    value={maxFileMiB()}
                    onInput={(event) => setMaxFileMiB(event.currentTarget.value)}
                  />
                </div>
              </section>

              <section class="data-shell space-y-4 p-4">
                <div>
                  <h2 class="text-base font-semibold">{t("settings.aiPolicy")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{t("settings.aiPolicyHelp")}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="space-y-1.5">
                    <Label for="chat-history">{t("settings.chatHistory")}</Label>
                    <Input id="chat-history" type="number" min={limits()?.chatbot.min_history_turns} max={limits()?.chatbot.max_history_turns} value={chatbotHistoryTurns()} onInput={(e) => setChatbotHistoryTurns(e.currentTarget.value)} />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="chat-threads">{t("settings.chatThreads")}</Label>
                    <Input id="chat-threads" type="number" min={limits()?.chatbot.min_max_threads} max={limits()?.chatbot.max_max_threads} value={maxChatbotThreads()} onInput={(e) => setMaxChatbotThreads(e.currentTarget.value)} />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="chat-message">{t("settings.chatMessage")}</Label>
                    <Input id="chat-message" type="number" min={limits()?.chatbot.min_max_message_len} max={limits()?.chatbot.max_max_message_len} value={maxChatbotMessageLen()} onInput={(e) => setMaxChatbotMessageLen(e.currentTarget.value)} />
                  </div>
                </div>
              </section>
              <section class="data-shell space-y-4 p-4">
                <div>
                  <h2 class="text-base font-semibold">{t("settings.modules")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{t("settings.modulesHelp")}</p>
                </div>
                <Suspense fallback={<PageSpinner />}>
                  <Show when={modulesInfo.error}>
                    <ErrorAlert message={formatApiError(modulesInfo.error)} onRetry={() => void refetchModules()} />
                  </Show>
                  <Show when={modulesInfo()}>
                    {(info) => (
                      <div class="space-y-3">
                        <For each={info().catalog.packages}>
                          {(pkg) => (
                            <div class="space-y-1.5">
                              <h3 class="text-sm font-medium capitalize">{pkg.package}</h3>
                              <div class="flex flex-wrap gap-1.5">
                                <For each={pkg.modules}>
                                  {(name) => (
                                    <Badge variant={info().mine.enabled.includes(name) ? "secondary" : "outline"} class="rounded-full">
                                      {name}
                                    </Badge>
                                  )}
                                </For>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    )}
                  </Show>
                </Suspense>
              </section>
            </Show>
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

function EmptyRows(props: { label: string }) {
  return (
    <div class="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-8 text-center text-xs text-muted-foreground">
      {props.label}
    </div>
  );
}
