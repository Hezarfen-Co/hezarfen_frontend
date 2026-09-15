import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { getLimits } from "@/api/limits";
import {
  deleteMealBookingById,
  deleteMealDishById,
  deleteMealMenuById,
  getDietaryProfileByUserId,
  getMealAttendanceByUserId,
  getMealBalanceByUserId,
  getMealLedgerByUserId,
  getMealMenuAttendance,
  getMealMenuBookings,
  getMealMenuById,
  getMyDietaryProfile,
  getMyMealBalance,
  getMyMealBookings,
  patchDietaryProfileByUserId,
  patchMealDishById,
  patchMealMenuById,
  postMealAttendance,
  postMealBooking,
  postMealCredit,
  postMealDish,
} from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getSettings } from "@/api/settings";
import { getTime } from "@/api/time";
import { formatApiError, type MealAttendance, type MealBooking, type MealDish, type PersonRef } from "@/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconAlert, IconChevronLeft, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SidePanel } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { formatDateTime } from "@/lib/format";
import { formatTry, mealCutoffAt } from "@/lib/meals";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function MealDetailPage() {
  return <RouteGuard><MealDetailContent /></RouteGuard>;
}

function MealDetailContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ from: "/meals/$id" });
  const id = createMemo(() => { location(); return params().id; });
  const role = () => auth.user()!.role;
  const isStudent = () => role() === "student";
  const isParent = () => role() === "parent";
  const canServe = () => hasMinRole(role(), "teacher");
  const canManage = () => hasMinRole(role(), "manager");
  // Canteen balance/ledger are family-money reads: self, a parent of the
  // student, or manager+. Teachers are no longer allowed (backend 403s).
  const canReadMoney = () => isStudent() || isParent() || canManage();
  const isAdmin = () => role() === "admin";
  const moneyLocale = () => locale() === "tr" ? "tr-TR" : "en-US";

  const [menu, { refetch: refetchMenu }] = createResource(id, (menuId) => getMealMenuById(menuId));
  const [settings] = createResource(() => getSettings());
  const [limits, { refetch: refetchLimits }] = createResource(() => getLimits());
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [children] = createResource(() => isParent() ? getMyStudents({ limit: 100 }) : null);
  const [selectedStudent, setSelectedStudent] = createSignal("");
  const [lookupStudent, setLookupStudent] = createSignal("");
  const [tab, setTab] = createSignal("menu");
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [cancelOpen, setCancelOpen] = createSignal(false);
  // Manager-only: cancel any student's booking from the service list (backend
  // lets manager+ bypass the cutoff). Holds the booking pending confirmation.
  const [cancelBooking, setCancelBooking] = createSignal<MealBooking | null>(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = createSignal(false);
  const [deleteDish, setDeleteDish] = createSignal<MealDish | null>(null);

  createEffect(() => {
    if (isParent() && !selectedStudent() && children()?.items[0]) setSelectedStudent(children()!.items[0].id);
  });
  // null, not "", until a student is chosen: createResource still fetches on an
  // empty-string source, and `/meals/profiles/` 404s the whole page for staff.
  const targetId = () => (isStudent() ? auth.user()!.id : isParent() ? selectedStudent() : lookupStudent()) || null;
  const canBook = () => (isStudent() || isParent()) && !!targetId();

  const [bookings, { refetch: refetchBookings }] = createResource(() => canBook(), async (enabled) => enabled ? getMyMealBookings({ limit: 100 }) : null);
  const activeBooking = createMemo(() => bookings()?.items.find((booking) => booking.menu_id === id() && booking.student.id === targetId() && booking.status === "booked") ?? null);
  const [profile, { refetch: refetchProfile }] = createResource(
    targetId,
    async (userId) => userId === auth.user()!.id ? getMyDietaryProfile() : getDietaryProfileByUserId(userId),
  );
  const [balance, { refetch: refetchBalance }] = createResource(
    () => canReadMoney() ? targetId() : null,
    async (userId) => userId === auth.user()!.id ? getMyMealBalance() : getMealBalanceByUserId(userId),
  );
  const [ledger, { refetch: refetchLedger }] = createResource(() => canReadMoney() ? targetId() : null, (userId) => getMealLedgerByUserId(userId, { limit: 20 }));
  const [attendance] = createResource(targetId, (userId) => getMealAttendanceByUserId(userId, { limit: 20 }));
  // The backend does not expose a teacher-visible service-roster endpoint.
  // Teachers can still see and amend recorded service; managers additionally
  // receive the supported booking audit and get the combined operational list.
  const [serviceAttendance, { refetch: refetchServiceAttendance }] = createResource(
    () => canServe() ? id() : null,
    (menuId) => getMealMenuAttendance(menuId, { limit: 100 }),
  );
  const [serviceBookings, { refetch: refetchServiceBookings }] = createResource(
    () => canManage() ? id() : null,
    (menuId) => getMealMenuBookings(menuId, { limit: 100 }),
  );
  const [audit] = createResource(
    () => canManage() ? id() : null,
    (menuId) => getMealMenuBookings(menuId, { limit: 100 }),
  );

  const serviceEntries = createMemo(() => {
    const entries = new Map<string, { student: PersonRef; booking: MealBooking | null; attendance: MealAttendance | null }>();
    for (const booking of serviceBookings()?.items ?? []) entries.set(booking.student.id, { student: booking.student, booking, attendance: null });
    for (const attendanceRow of serviceAttendance()?.items ?? []) {
      const existing = entries.get(attendanceRow.student.id);
      entries.set(attendanceRow.student.id, { student: attendanceRow.student, booking: existing?.booking ?? null, attendance: attendanceRow });
    }
    return [...entries.values()];
  });
  const refetchService = () => Promise.all([refetchServiceAttendance(), refetchServiceBookings()]);

  const total = () => menu()?.dishes.reduce((sum, dish) => sum + dish.price_minor, 0) ?? 0;
  const conflicts = () => [...new Set(menu()?.dishes.flatMap((dish) => dish.conflicts) ?? [])];
  const slot = () => settings()?.meal_slots.find((item) => item.name === menu()?.slot);
  const cutoff = () => menu() ? mealCutoffAt(menu()!.date, slot(), settings()?.meal_cancel_cutoff_minutes ?? null) : null;
  const cutoffClosed = () => cutoff() != null && (serverTime()?.now ?? Date.now()) >= cutoff()!;

  const [capacity, setCapacity] = createSignal("");
  const [showMenuEdit, setShowMenuEdit] = createSignal(false);
  const [showDishForm, setShowDishForm] = createSignal(false);
  const [editingDish, setEditingDish] = createSignal<MealDish | null>(null);
  const [dishName, setDishName] = createSignal("");
  const [dishDescription, setDishDescription] = createSignal("");
  const [dishPrice, setDishPrice] = createSignal("");
  const [dishTags, setDishTags] = createSignal<string[]>([]);
  const [profileTags, setProfileTags] = createSignal<string[]>([]);
  const [profileNote, setProfileNote] = createSignal("");
  const [creditAmount, setCreditAmount] = createSignal("");
  const [creditMethod, setCreditMethod] = createSignal("");
  const [creditNote, setCreditNote] = createSignal("");
  const [walkIn, setWalkIn] = createSignal("");

  createEffect(() => {
    if (profile()) { setProfileTags([...profile()!.tags]); setProfileNote(profile()!.note ?? ""); }
  });
  const run = async (work: () => Promise<void>, message = t("common.saved")) => {
    setPending(true); setError(""); setSuccess("");
    try { await work(); setSuccess(message); }
    catch (err) { setError(formatApiError(err)); }
    finally { setPending(false); }
  };
  const openDish = (dish?: MealDish) => {
    setEditingDish(dish ?? null);
    setDishName(dish?.name ?? ""); setDishDescription(dish?.description ?? "");
    setDishPrice(dish ? String(dish.price_minor / 100) : ""); setDishTags(dish?.tags ?? []);
    setShowDishForm(true);
  };
  const toggleTag = (tag: string, selected: string[], set: (value: string[]) => void) =>
    set(selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag]);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={menu()?.id === id() ? menu() : undefined} fallback={<Show when={menu.error} fallback={<PageSpinner />}><ErrorAlert message={formatApiError(menu.error)} onRetry={() => void refetchMenu()} /></Show>}>
        {(current) => (
          <div class="space-y-5">
            <PageHeader
              eyebrow={`${current().date} · ${current().slot}`}
              title={t("meals.menu")}
              description={t("meals.detailHelp")}
              actions={<div class="detail-action-group"><Link to="/meals"><Button variant="ghost" size="sm"><IconChevronLeft class="h-4 w-4" />{t("common.back")}</Button></Link><Show when={canManage()}><Button variant="outline" size="sm" onClick={() => { setCapacity(current().capacity == null ? "" : String(current().capacity)); setShowMenuEdit(true); }}><IconEdit class="h-4 w-4" />{t("common.edit")}</Button><Button variant="destructive" size="sm" onClick={() => setDeleteMenuOpen(true)}><IconTrash class="h-4 w-4" />{t("common.delete")}</Button></Show></div>}
            />
            <Show when={limits.error}><ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} /></Show>
            <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
            <Show when={success()}><Alert variant="success">{success()}</Alert></Show>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("meals.total")}</p><p class="mt-1 font-semibold">{formatTry(total(), moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("meals.capacity")}</p><p class="mono mt-1 font-semibold">{current().capacity ?? "∞"}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("meals.cutoff")}</p><p class="mt-1 font-semibold">{cutoff() == null ? t("meals.noCutoff") : formatDateTime(cutoff(), locale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("meals.bookingStatus")}</p><p class="mt-1 font-semibold">{cutoffClosed() ? t("meals.closed") : t("meals.open")}</p></div>
            </div>

            <Show when={conflicts().length > 0}>
              <Alert class="border-warning/50 bg-warning/10 text-warning"><span class="flex gap-2"><IconAlert class="mt-0.5 h-4 w-4 shrink-0" /><span>{t("meals.conflict")}: {conflicts().join(", ")}</span></span></Alert>
            </Show>

            <Show when={isParent()}>
              <div class="data-shell max-w-md p-4"><Label for="meal-child">{t("meals.child")}</Label><SearchableSelect id="meal-child" value={selectedStudent()} onChange={setSelectedStudent} options={(children()?.items ?? []).map((child) => ({ value: child.id, label: personLabel(child) }))} /></div>
            </Show>

            <Tabs value={tab()} onChange={setTab}>
              <TabsList>
                <TabsTrigger value="menu">{t("meals.menu")}</TabsTrigger>
                <Show when={canBook()}><TabsTrigger value="account">{t("meals.myAccount")}</TabsTrigger></Show>
                <Show when={canServe()}><TabsTrigger value="service">{t("meals.service")}</TabsTrigger></Show>
                <Show when={canManage()}><TabsTrigger value="manage">{t("meals.manage")}</TabsTrigger></Show>
              </TabsList>

              <TabsContent value="menu" class="space-y-4">
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <For each={current().dishes}>{(dish) => (
                    <article class="rounded-xl border border-border-line bg-surface-base p-4">
                      <div class="flex justify-between gap-3"><h2 class="font-semibold text-text-strong">{dish.name}</h2><span class="font-semibold">{formatTry(dish.price_minor, moneyLocale())}</span></div>
                      <p class="mt-2 text-sm text-text-subtle">{dish.description || "—"}</p>
                      <div class="mt-3 flex flex-wrap gap-1"><For each={dish.tags}>{(tag) => <Badge variant="outline" class={dish.conflicts.includes(tag) ? "border-warning/50 bg-warning/10 text-warning" : ""}>{dish.conflicts.includes(tag) ? `⚠ ${tag}` : tag}</Badge>}</For></div>
                      <Show when={canManage()}><div class="mt-3 flex gap-2 border-t border-border-hairline pt-3"><Button variant="outline" size="sm" onClick={() => openDish(dish)}>{t("common.edit")}</Button><Button variant="ghost" size="sm" class="text-destructive" onClick={() => setDeleteDish(dish)}>{t("common.delete")}</Button></div></Show>
                    </article>
                  )}</For>
                </div>
                <Show when={current().dishes.length === 0}><EmptyState kind="meals" title={t("meals.noDishes")} /></Show>
                <Show when={canBook()}>
                  <div class="data-shell flex flex-wrap items-center justify-between gap-3 p-4">
                    <div><p class="font-semibold">{activeBooking() ? t("meals.booked") : t("meals.notBooked")}</p><p class="text-sm text-muted-foreground">{cutoffClosed() ? t("meals.cutoffPassed") : t("meals.bookingHelp")}</p></div>
                    <Show when={activeBooking()} fallback={<Button disabled={pending() || cutoffClosed()} onClick={() => void run(async () => { await postMealBooking(id(), isParent() ? targetId() ?? undefined : undefined); await Promise.all([refetchBookings(), refetchBalance(), refetchLedger()]); }, t("meals.booked"))}>{t("meals.book")}</Button>}><Button variant="destructive" disabled={pending() || cutoffClosed()} onClick={() => setCancelOpen(true)}>{t("meals.cancelBooking")}</Button></Show>
                  </div>
                </Show>
              </TabsContent>

              <TabsContent value="account" class="space-y-4">
                <div class="grid gap-4 lg:grid-cols-2">
                  <section class="data-shell p-4"><h2 class="font-semibold text-text-strong">{t("meals.dietaryProfile")}</h2><div class="mt-3 flex flex-wrap gap-1.5"><For each={profile()?.tags ?? []}>{(tag) => <Badge variant="outline" class="border-warning/50 bg-warning/10 text-warning">⚠ {tag}</Badge>}</For></div><p class="mt-3 text-sm text-text-subtle">{profile()?.note || t("meals.noDietaryNotes")}</p></section>
                  <Show when={canReadMoney()}><section class="data-shell p-4"><h2 class="font-semibold text-text-strong">{t("meals.balance")}</h2><p class="mt-3 text-2xl font-semibold tabular-nums">{formatTry(balance()?.balance_minor ?? 0, moneyLocale())}</p></section></Show>
                </div>
                <Show when={canReadMoney()}><section class="data-shell p-4"><h2 class="font-semibold text-text-strong">{t("meals.ledger")}</h2><div class="mt-3 divide-y divide-border-hairline"><For each={ledger()?.items ?? []}>{(line) => <div class="flex justify-between gap-3 py-3 text-sm"><div><p class="font-medium">{t(`meals.ledger.${line.kind}` as never)}</p><p class="text-xs text-text-subtle">{line.note || line.method || "—"} · {formatDateTime(line.created_at, locale())}</p></div><span class="font-semibold tabular-nums">{line.kind === "charge" ? "−" : "+"}{formatTry(line.amount_minor, moneyLocale())}</span></div>}</For></div><Show when={(ledger()?.items.length ?? 0) === 0}><p class="mt-3 text-sm text-text-subtle">{t("meals.noLedger")}</p></Show></section></Show>
                <section class="data-shell p-4"><h2 class="font-semibold text-text-strong">{t("meals.attendance")}</h2><div class="mt-3 divide-y divide-border-hairline"><For each={attendance()?.items ?? []}>{(row) => <div class="flex justify-between gap-3 py-3 text-sm"><span>{row.status}</span><span class="text-text-subtle">{formatDateTime(row.marked_at, locale())}</span></div>}</For></div></section>
              </TabsContent>

              <TabsContent value="service" class="space-y-4">
                <div class="data-shell p-4">
                  <h2 class="font-semibold text-text-strong">{t("meals.walkIn")}</h2>
                  <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"><div class="min-w-0 flex-1"><UserSearchSelect id="meal-walkin" value={walkIn()} onChange={setWalkIn} placeholder={t("form.selectStudent")} /></div><Button disabled={!walkIn() || pending()} onClick={() => void run(async () => { await postMealAttendance(id(), walkIn(), "served"); setWalkIn(""); await refetchService(); })}>{t("meals.served")}</Button></div>
                </div>
                <Show when={serviceAttendance.error || serviceBookings.error}><ErrorAlert message={formatApiError(serviceAttendance.error || serviceBookings.error)} onRetry={() => void refetchService()} /></Show>
                <div class="space-y-2">
                  <For each={serviceEntries()}>{(entry) => <div class="data-shell flex flex-wrap items-center justify-between gap-3 p-3"><div><p class="font-medium">{personLabel(entry.student)}</p><p class="text-xs text-text-subtle">{entry.booking ? t("meals.booked") : t("meals.walkIn")} · {entry.attendance?.status ?? t("meals.notMarked")}</p></div><div class="flex gap-2"><Button size="sm" variant={entry.attendance?.status === "served" ? "default" : "outline"} onClick={() => void run(async () => { await postMealAttendance(id(), entry.student.id, "served"); await refetchService(); })}>{t("meals.served")}</Button><Button size="sm" variant={entry.attendance?.status === "missed" ? "destructive" : "outline"} onClick={() => void run(async () => { await postMealAttendance(id(), entry.student.id, "missed"); await refetchService(); })}>{t("meals.missed")}</Button><Show when={canManage() && entry.booking?.status === "booked"}><Button size="sm" variant="ghost" class="text-destructive" onClick={() => setCancelBooking(entry.booking)}>{t("meals.cancelBooking")}</Button></Show></div></div>}</For>
                </div>
              </TabsContent>

              <TabsContent value="manage" class="space-y-5">
                <div class="flex justify-end"><Button size="sm" class="rounded-lg" onClick={() => openDish()}><IconPlus class="h-4 w-4" />{t("meals.addDish")}</Button></div>
                <section class="data-shell space-y-4 p-4">
                  <h2 class="font-semibold text-text-strong">{t("meals.studentRecord")}</h2>
                  <UserSearchSelect id="meal-record-user" role="student" value={lookupStudent()} onChange={setLookupStudent} label={t("meals.student")} />
                  <Show when={lookupStudent()}>
                    <div class="space-y-3">
                      <div class="flex flex-wrap gap-2"><For each={settings()?.dietary_tags ?? []}>{(tag) => <label class="flex items-center gap-2 rounded-lg border border-border-line px-3 py-2 text-sm"><input type="checkbox" checked={profileTags().includes(tag)} onChange={() => toggleTag(tag, profileTags(), setProfileTags)} />{tag}</label>}</For></div>
                      <Textarea maxlength={limits()?.meal.max_dietary_note_len} value={profileNote()} placeholder={t("meals.dietaryNote")} onInput={(e) => setProfileNote(e.currentTarget.value)} />
                      <Button disabled={pending()} onClick={() => void run(async () => { await patchDietaryProfileByUserId(lookupStudent(), { tags: profileTags(), note: profileNote().trim() || null }); await refetchProfile(); })}>{t("common.save")}</Button>
                    </div>
                  </Show>
                </section>
                <section class="data-shell p-4"><h2 class="font-semibold text-text-strong">{t("meals.bookingAudit")}</h2><div class="mt-3 divide-y divide-border-hairline"><For each={audit()?.items ?? []}>{(booking) => <div class="flex justify-between gap-3 py-3 text-sm"><span>{personLabel(booking.student)}</span><Badge variant={booking.status === "booked" ? "default" : "secondary"}>{booking.status}</Badge></div>}</For></div></section>
                <Show when={isAdmin()}>
                  <section class="data-shell space-y-3 p-4"><h2 class="font-semibold text-text-strong">{t("meals.recordCredit")}</h2><p class="text-sm text-text-subtle">{t("meals.creditAppendOnly")}</p><Input type="number" min={0.01} step={0.01} value={creditAmount()} placeholder={t("meals.amountTry")} onInput={(e) => setCreditAmount(e.currentTarget.value)} /><Input maxlength={limits()?.meal.max_ledger_method_len} value={creditMethod()} placeholder={t("meals.method")} onInput={(e) => setCreditMethod(e.currentTarget.value)} /><Textarea maxlength={limits()?.meal.max_ledger_note_len} value={creditNote()} placeholder={t("meals.note")} onInput={(e) => setCreditNote(e.currentTarget.value)} /><Button disabled={!lookupStudent() || pending()} onClick={() => void run(async () => { await postMealCredit({ student_id: lookupStudent(), amount_minor: Math.round(Number(creditAmount()) * 100), method: creditMethod().trim() || undefined, note: creditNote().trim() || undefined }); setCreditAmount(""); setCreditMethod(""); setCreditNote(""); await Promise.all([refetchBalance(), refetchLedger()]); }, t("meals.creditRecorded"))}>{t("meals.recordCredit")}</Button></section>
                </Show>
              </TabsContent>
            </Tabs>

            <ConfirmDialog open={cancelOpen()} onOpenChange={setCancelOpen} title={t("meals.cancelBooking")} variant="destructive" summary={t("meals.cancelSummary")} onConfirm={() => run(async () => { const booking = activeBooking(); if (!booking) return; await deleteMealBookingById(booking.id); await Promise.all([refetchBookings(), refetchBalance(), refetchLedger()]); }, t("meals.cancelled"))} />
            <ConfirmDialog open={cancelBooking() !== null} onOpenChange={(open) => !open && setCancelBooking(null)} title={t("meals.cancelBooking")} variant="destructive" summary={cancelBooking() ? `${t("meals.cancelSummary")} · ${personLabel(cancelBooking()!.student)}` : ""} onConfirm={() => run(async () => { const booking = cancelBooking(); if (!booking) return; await deleteMealBookingById(booking.id); setCancelBooking(null); await Promise.all([refetchService(), refetchServiceBookings()]); }, t("meals.cancelled"))} />
            <ConfirmDialog open={deleteMenuOpen()} onOpenChange={setDeleteMenuOpen} title={t("meals.deleteMenu")} variant="destructive" summary={`${current().date} · ${current().slot}`} onConfirm={() => run(async () => { await deleteMealMenuById(id()); void navigate({ to: "/meals" }); }, t("common.deleted"))} />
            <ConfirmDialog open={deleteDish() !== null} onOpenChange={(open) => !open && setDeleteDish(null)} title={t("meals.deleteDish")} variant="destructive" summary={deleteDish()?.name ?? ""} onConfirm={() => run(async () => { if (!deleteDish()) return; await deleteMealDishById(deleteDish()!.id); setDeleteDish(null); await refetchMenu(); }, t("common.deleted"))} />

            <SidePanel open={showMenuEdit()} onOpenChange={setShowMenuEdit} title={t("meals.editMenu")} description={`${current().date} · ${current().slot}`}>
              <form class="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(async () => { await patchMealMenuById(id(), { capacity: capacity() ? Number(capacity()) : null }); setShowMenuEdit(false); await refetchMenu(); }); }}><div class="space-y-1.5"><Label for="menu-capacity">{t("meals.capacity")}</Label><Input id="menu-capacity" type="number" min={0} max={limits()?.meal.max_menu_capacity} value={capacity()} onInput={(e) => setCapacity(e.currentTarget.value)} /></div><Button type="submit" disabled={pending()}>{t("common.save")}</Button></form>
            </SidePanel>
            <SidePanel open={showDishForm()} onOpenChange={setShowDishForm} title={editingDish() ? t("meals.editDish") : t("meals.addDish")} description={`${current().date} · ${current().slot}`}>
              <form class="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(async () => { const body = { name: dishName().trim(), description: dishDescription().trim() || null, price_minor: Math.round(Number(dishPrice()) * 100), tags: dishTags() }; if (editingDish()) await patchMealDishById(editingDish()!.id, body); else await postMealDish(id(), body); setShowDishForm(false); await refetchMenu(); }); }}>
                <div class="space-y-1.5"><Label for="dish-name">{t("meals.dishName")}</Label><Input id="dish-name" required maxlength={limits()?.meal.max_dish_name_len} value={dishName()} onInput={(e) => setDishName(e.currentTarget.value)} /></div>
                <div class="space-y-1.5"><Label for="dish-description">{t("form.description")}</Label><Textarea id="dish-description" maxlength={limits()?.meal.max_dish_description_len} value={dishDescription()} onInput={(e) => setDishDescription(e.currentTarget.value)} /></div>
                <div class="space-y-1.5"><Label for="dish-price">{t("meals.priceTry")}</Label><Input id="dish-price" required type="number" min={0} step={0.01} value={dishPrice()} onInput={(e) => setDishPrice(e.currentTarget.value)} /></div>
                <div class="flex flex-wrap gap-2"><For each={settings()?.dietary_tags ?? []}>{(tag) => <label class="flex items-center gap-2 rounded-lg border border-border-line px-3 py-2 text-sm"><input type="checkbox" checked={dishTags().includes(tag)} onChange={() => toggleTag(tag, dishTags(), setDishTags)} />{tag}</label>}</For></div>
                <Button type="submit" disabled={pending()}>{t("common.save")}</Button>
              </form>
            </SidePanel>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
