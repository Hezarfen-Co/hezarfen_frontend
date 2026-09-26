import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getLimits } from "@/api/limits";
import { getMealMenus, postMealMenu } from "@/api/meals";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import { MealDayGroup } from "@/components/meals/meal-day-group";
import { MealDayPicker } from "@/components/meals/meal-day-picker";
import { MealPublishPanel, type MealPublishInput } from "@/components/meals/meal-publish-panel";
import { MealWeekNav } from "@/components/meals/meal-week-nav";
import { DataSection } from "@/components/ui/data-section";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { addDaysIso, groupMenusByDay, localIsoDate, weekStartIso } from "@/lib/meals";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

// A school publishes at most a few slots a day, so one Monday–Sunday week is
// a small, bounded list: fetch it whole and group it by day on the client.
const WEEK_LIMIT = 100;

export default function MealsPage() {
  return <RouteGuard><MealsContent /></RouteGuard>;
}

function MealsContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const intlLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  const canManage = () => hasMinRole(auth.user()?.role, "manager");
  const today = localIsoDate();
  const thisWeek = weekStartIso(today);
  const [weekStart, setWeekStart] = createSignal(thisWeek);
  const [selectedDate, setSelectedDate] = createSignal(today);
  const [slot, setSlot] = createSignal("all");
  const [showCreate, setShowCreate] = createSignal(false);
  const [flash, setFlash] = createFlash();
  const [settings] = createResource(() => getSettings());
  const [limits, { refetch: refetchLimits }] = createResource(() => (canManage() ? getLimits() : null));
  const [menus, { refetch }] = createResource(
    () => [weekStart(), slot()] as const,
    // `to` is a day past Sunday so the week is whole whether the API reads it
    // inclusively or not; the filter below trims anything past Sunday. A real
    // slot is filtered server-side; "all" is a pseudo-option the api helper
    // drops, so the request stays unfiltered then.
    ([start, chosenSlot]) =>
      getMealMenus({ from: start, to: addDaysIso(start, 7), slot: chosenSlot, limit: WEEK_LIMIT, offset: 0 }),
  );

  const slots = () => settings()?.meal_slots ?? [];
  const days = createMemo(() => {
    const end = addDaysIso(weekStart(), 6);
    const items = (menus()?.items ?? []).filter(
      (menu) => menu.date >= weekStart() && menu.date <= end && (slot() === "all" || menu.slot === slot()),
    );
    return groupMenusByDay(items, slots().map((item) => item.name));
  });
  const selectedMenus = createMemo(() => days().find((day) => day.date === selectedDate())?.menus ?? []);

  const changeWeek = (start: string, chosenDate?: string) => {
    setWeekStart(start);
    setSelectedDate(chosenDate ?? (start === thisWeek ? today : start));
  };

  const publish = async (input: MealPublishInput) => {
    await postMealMenu(input);
    setShowCreate(false);
    await refetch();
    setFlash(t("common.created"));
  };

  return (
    <div class="space-y-5">
      <MealPublishPanel
        open={showCreate()}
        onOpenChange={setShowCreate}
        initialDate={today}
        slots={slots()}
        limits={limits()}
        limitsError={limits.error ? formatApiError(limits.error) : undefined}
        onRetryLimits={() => void refetchLimits()}
        onPublish={publish}
      />
      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <DataSection
        title={t("meals.title")}
        description={t("meals.subtitle")}
        actions={
          <Show when={canManage()}>
            <Button size="sm" class="min-w-[7.5rem]" onClick={() => setShowCreate(true)}>
              <IconPlus class="h-4 w-4" />
              {t("meals.publish")}
            </Button>
          </Show>
        }
      >
        <MealWeekNav
          weekStart={weekStart()}
          thisWeek={thisWeek}
          locale={intlLocale()}
          slot={slot()}
          slots={slots()}
          onWeekChange={changeWeek}
          onSlotChange={setSlot}
        />
        <Suspense fallback={<PageSpinner />}>
          <Show when={menus.error}><ErrorAlert message={formatApiError(menus.error)} onRetry={() => void refetch()} /></Show>
          <Show when={!menus.error}>
            <div class="space-y-5" aria-busy={menus.loading}>
              <MealDayPicker
                weekStart={weekStart()}
                selectedDate={selectedDate()}
                locale={intlLocale()}
                days={days()}
                onSelect={setSelectedDate}
              />
              <Show
                when={days().length > 0}
                fallback={<EmptyState kind="meals" title={t("meals.emptyWeek")} description={t("meals.emptyWeekHint")} />}
              >
                <MealDayGroup date={selectedDate()} menus={selectedMenus()} locale={intlLocale()} isToday={selectedDate() === today} />
              </Show>
            </div>
          </Show>
        </Suspense>
      </DataSection>
    </div>
  );
}
