import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getLimits } from "@/api/limits";
import { getMealMenuBookings, getMealMenus, postMealMenu } from "@/api/meals";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import { MealMenuCard } from "@/components/meals/meal-menu-card";
import { DatePicker } from "@/components/ui/date-picker";
import { DataSection } from "@/components/ui/data-section";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { inputDateToIso, isoDateToInput } from "@/lib/datetime-input";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);

export default function MealsPage() {
  return <RouteGuard><MealsContent /></RouteGuard>;
}

function MealsContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const canManage = () => hasMinRole(auth.user()?.role, "manager");
  const [page, setPage] = createSignal(0);
  const [from, setFrom] = createSignal(today());
  const [slot, setSlot] = createSignal("all");
  const [showCreate, setShowCreate] = createSignal(false);
  const [date, setDate] = createSignal(today());
  const [newSlot, setNewSlot] = createSignal("");
  const [capacity, setCapacity] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [settings] = createResource(() => getSettings());
  const [limits, { refetch: refetchLimits }] = createResource(() => canManage() ? getLimits() : null);
  const [menus, { refetch }] = createResource(
    () => [from(), page()] as const,
    async ([start, index]) => getMealMenus({ from: start || undefined, limit: PAGE_SIZE, offset: index * PAGE_SIZE }),
  );
  const visible = createMemo(() => slot() === "all" ? menus()?.items ?? [] : (menus()?.items ?? []).filter((menu) => menu.slot === slot()));
  const totalPages = createMemo(() => Math.max(1, Math.ceil((menus()?.total ?? 0) / PAGE_SIZE)));

  // Real occupancy = confirmed bookings / capacity, both true fields — not the
  // fabricated İyi/Takipte/Risk badge Figma shows. `getMealMenuBookings` is
  // the same manager-only booking-audit read already used on the detail page,
  // so this only runs for managers and only for the menus on screen.
  const [reservationCounts] = createResource(
    () => canManage() ? visible().map((menu) => menu.id) : null,
    async (ids) => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            return [id, (await getMealMenuBookings(id, { limit: 1 })).total] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return new Map(entries);
    },
  );

  const publish = async (event: SubmitEvent) => {
    event.preventDefault();
    setPending(true); setError("");
    try {
      await postMealMenu({ date: date(), slot: newSlot(), capacity: capacity() ? Number(capacity()) : null });
      setShowCreate(false); setCapacity(""); await refetch(); setFlash(t("common.created"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-5">
      <SidePanel open={showCreate()} onOpenChange={setShowCreate} title={t("meals.publish")} description={t("meals.publishHelp")}>
        <form class="space-y-4" onSubmit={publish}>
          <Show when={limits.error}><ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} /></Show>
          <div class="space-y-1.5"><Label for="meal-date">{t("meals.date")}</Label><DatePicker id="meal-date" required placeholder={t("form.datePlaceholder")} value={isoDateToInput(date())} onChange={(value) => setDate(inputDateToIso(value))} /></div>
          <div class="space-y-1.5"><Label for="meal-slot">{t("meals.slot")}</Label><Select id="meal-slot" required value={newSlot()} onChange={(e) => setNewSlot(e.currentTarget.value)}><For each={settings()?.meal_slots ?? []}>{(item) => <option value={item.name}>{item.name}</option>}</For></Select></div>
          <div class="space-y-1.5"><Label for="meal-capacity">{t("meals.capacity")}</Label><Input id="meal-capacity" type="number" min={0} max={limits()?.meal.max_menu_capacity} value={capacity()} onInput={(e) => setCapacity(e.currentTarget.value)} /></div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>
      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <DataSection title={t("meals.title")} description={t("meals.subtitle")} actions={<Show when={canManage()}><Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => { setNewSlot(settings()?.meal_slots[0]?.name ?? ""); setShowCreate(true); }}><IconPlus class="h-4 w-4" />{t("meals.publish")}</Button></Show>}>
        <div class="flex flex-wrap items-center gap-2">
          <DatePicker id="menus-from" class="h-8 w-44" placeholder={t("meals.from")} value={isoDateToInput(from())} onChange={(value) => { const iso = inputDateToIso(value); if (iso) { setFrom(iso); setPage(0); } }} />
          <Select id="menus-slot" aria-label={t("meals.slot")} wrapperClass="w-auto" class="h-8 rounded-lg text-[13px]" value={slot()} onChange={(e) => setSlot(e.currentTarget.value)}><option value="all">{t("meals.slot")}: {t("common.all")}</option><For each={settings()?.meal_slots ?? []}>{(item) => <option value={item.name}>{item.name}</option>}</For></Select>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <Show when={menus.error}><ErrorAlert message={formatApiError(menus.error)} onRetry={() => void refetch()} /></Show>
          <Show when={visible().length > 0} fallback={<EmptyState kind="meals" title={t("meals.empty")} />}>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><For each={visible()}>{(menu) => <MealMenuCard menu={menu} locale={locale() === "tr" ? "tr-TR" : "en-US"} labels={{ dishes: t("meals.dishes"), capacity: t("meals.capacity"), conflict: t("meals.conflict"), reservations: t("meals.reservations"), topPick: t("meals.topPick") }} reservationCount={reservationCounts()?.get(menu.id) ?? undefined} />}</For></div>
            <PaginationControls page={page()} totalPages={totalPages()} onPageChange={setPage} />
          </Show>
        </Suspense>
      </DataSection>
    </div>
  );
}
