import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
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
  type MealDishBody,
} from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getSettings } from "@/api/settings";
import { getTime } from "@/api/time";
import { formatApiError, type MealBooking, type MealDish } from "@/api/client";
import { MealAccountCard } from "@/components/meals/meal-account-card";
import { MealAttendanceTable } from "@/components/meals/meal-attendance-table";
import { MealBookingCard } from "@/components/meals/meal-booking-card";
import { MealDishList } from "@/components/meals/meal-dish-list";
import { MealDishPanel } from "@/components/meals/meal-dish-panel";
import { MealFact } from "@/components/meals/meal-fact";
import { MealLedgerTable } from "@/components/meals/meal-ledger-table";
import { MealMenuEditPanel } from "@/components/meals/meal-menu-edit-panel";
import { MealServiceTable } from "@/components/meals/meal-service-table";
import type { MealServiceEntry } from "@/components/meals/meal-service-table.types";
import { MealStudentRecordPanel, type MealCreditInput } from "@/components/meals/meal-student-record-panel";
import { MealWalkInPanel } from "@/components/meals/meal-walk-in-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOOLBAR_SLOT } from "@/components/ui/data-toolbar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconTrash, IconUsers } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { formatMealDay, formatTry, mealCutoffAt, mealSlotLabel } from "@/lib/meals";
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
  const moneyLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");

  const [menu, { refetch: refetchMenu }] = createResource(id, (menuId) => getMealMenuById(menuId));
  const [settings] = createResource(() => getSettings());
  const [limits, { refetch: refetchLimits }] = createResource(() => getLimits());
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [children] = createResource(() => (isParent() ? getMyStudents({ limit: 100 }) : null));
  const [selectedStudent, setSelectedStudent] = createSignal("");
  const [lookupStudent, setLookupStudent] = createSignal("");
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [cancelOpen, setCancelOpen] = createSignal(false);
  // Manager-only: cancel any student's booking from the service list (backend
  // lets manager+ bypass the cutoff). Holds the booking pending confirmation.
  const [cancelBooking, setCancelBooking] = createSignal<MealBooking | null>(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = createSignal(false);
  const [deleteDish, setDeleteDish] = createSignal<MealDish | null>(null);
  const [showMenuEdit, setShowMenuEdit] = createSignal(false);
  const [showDishForm, setShowDishForm] = createSignal(false);
  const [editingDish, setEditingDish] = createSignal<MealDish | null>(null);
  const [showWalkIn, setShowWalkIn] = createSignal(false);
  const [showRecord, setShowRecord] = createSignal(false);

  createEffect(() => {
    if (isParent() && !selectedStudent() && children()?.items[0]) setSelectedStudent(children()!.items[0].id);
  });
  // null, not "", until a student is chosen: createResource still fetches on an
  // empty-string source, and `/meals/profiles/` 404s the whole page for staff.
  const targetId = () => (isStudent() ? auth.user()!.id : isParent() ? selectedStudent() : lookupStudent()) || null;
  const canBook = () => (isStudent() || isParent()) && !!targetId();

  const [bookings, { refetch: refetchBookings }] = createResource(() => canBook(), async (enabled) => (enabled ? getMyMealBookings({ limit: 100 }) : null));
  const activeBooking = createMemo(() => bookings()?.items.find((booking) => booking.menu_id === id() && booking.student.id === targetId() && booking.status === "booked") ?? null);
  const [profile, { refetch: refetchProfile }] = createResource(
    targetId,
    async (userId) => (userId === auth.user()!.id ? getMyDietaryProfile() : getDietaryProfileByUserId(userId)),
  );
  const [balance, { refetch: refetchBalance }] = createResource(
    () => (canReadMoney() ? targetId() : null),
    async (userId) => (userId === auth.user()!.id ? getMyMealBalance() : getMealBalanceByUserId(userId)),
  );
  const [ledger, { refetch: refetchLedger }] = createResource(() => (canReadMoney() ? targetId() : null), (userId) => getMealLedgerByUserId(userId, { limit: 20 }));
  const [attendance] = createResource(targetId, (userId) => getMealAttendanceByUserId(userId, { limit: 20 }));
  // The backend does not expose a teacher-visible service-roster endpoint.
  // Teachers can still see and amend recorded service; managers additionally
  // receive the booking audit (every booking with its status), merged into
  // the same service list.
  const [serviceAttendance, { refetch: refetchServiceAttendance }] = createResource(
    () => (canServe() ? id() : null),
    (menuId) => getMealMenuAttendance(menuId, { limit: 100 }),
  );
  const [serviceBookings, { refetch: refetchServiceBookings }] = createResource(
    () => (canManage() ? id() : null),
    (menuId) => getMealMenuBookings(menuId, { limit: 100 }),
  );

  const serviceEntries = createMemo(() => {
    const entries = new Map<string, MealServiceEntry>();
    for (const booking of serviceBookings()?.items ?? []) entries.set(booking.student.id, { student: booking.student, booking, attendance: null });
    for (const attendanceRow of serviceAttendance()?.items ?? []) {
      const existing = entries.get(attendanceRow.student.id);
      entries.set(attendanceRow.student.id, { student: attendanceRow.student, booking: existing?.booking ?? null, attendance: attendanceRow });
    }
    return [...entries.values()];
  });
  const refetchService = () => Promise.all([refetchServiceAttendance(), refetchServiceBookings()]);
  // Confirmed bookings, only when the audit page holds every booking (a
  // truncated page would undercount).
  const bookedCount = () => {
    const page = serviceBookings();
    if (!page || page.items.length < page.total) return null;
    return page.items.filter((booking) => booking.status === "booked").length;
  };

  const total = () => menu()?.dishes.reduce((sum, dish) => sum + dish.price_minor, 0) ?? 0;
  const slot = () => settings()?.meal_slots.find((item) => item.name === menu()?.slot);
  const cutoff = () => (menu() ? mealCutoffAt(menu()!.date, slot(), settings()?.meal_cancel_cutoff_minutes ?? null) : null);
  const cutoffClosed = () => cutoff() != null && (serverTime()?.now ?? Date.now()) >= cutoff()!;
  const capacityLabel = () => (menu()?.capacity == null ? t("meals.unlimited") : String(menu()!.capacity));

  const run = async (work: () => Promise<void>, message = t("common.saved")): Promise<boolean> => {
    setPending(true); setError(""); setSuccess("");
    try { await work(); setSuccess(message); return true; }
    catch (err) { setError(formatApiError(err)); return false; }
    finally { setPending(false); }
  };
  const confirmRun = async (work: () => Promise<void>, message?: string) => { await run(work, message); };
  const openDish = (dish?: MealDish) => {
    setError("");
    setEditingDish(dish ?? null);
    setShowDishForm(true);
  };
  const refreshAccount = () => Promise.all([refetchBookings(), refetchBalance(), refetchLedger()]);
  const book = () => run(async () => {
    await postMealBooking(id(), isParent() ? targetId() ?? undefined : undefined);
    await refreshAccount();
  }, t("meals.booked"));
  const mark = (studentId: string, status: "served" | "missed") => run(async () => {
    await postMealAttendance(id(), studentId, status);
    await refetchService();
  });
  const saveDish = (body: MealDishBody) => run(async () => {
    const dish = editingDish();
    if (dish) await patchMealDishById(dish.id, body);
    else await postMealDish(id(), body);
    await refetchMenu();
  });
  const saveProfile = (tags: string[], note: string | null) => run(async () => {
    await patchDietaryProfileByUserId(lookupStudent(), { tags, note });
    await refetchProfile();
  });
  const recordCredit = (input: MealCreditInput) => run(async () => {
    await postMealCredit({ student_id: lookupStudent(), amount_minor: input.amountMinor, method: input.method, note: input.note });
    await Promise.all([refetchBalance(), refetchLedger()]);
  }, t("meals.creditRecorded"));

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={menu()?.id === id() ? menu() : undefined}
        fallback={<Show when={menu.error} fallback={<PageSpinner />}><ErrorAlert message={formatApiError(menu.error)} onRetry={() => void refetchMenu()} /></Show>}
      >
        {(current) => {
          const heading = () => `${formatMealDay(current().date, moneyLocale())} · ${mealSlotLabel(current().slot, t)}`;
          return (
            <div class="space-y-5">
              <section class="rounded-xl border border-border-line bg-surface-base px-4 py-3 shadow-xs sm:px-5">
                <Breadcrumbs items={[{ label: t("meals.title"), to: "/meals" }, { label: heading() }]} />
                <PageHeader
                  title={mealSlotLabel(current().slot, t)}
                  description={formatMealDay(current().date, moneyLocale(), true)}
                  actions={
                    canManage() ? (
                      <div class={cn("detail-action-group", TOOLBAR_SLOT)}>
                        <Button variant="outline" size="sm" class="flex-1 sm:flex-none" onClick={() => { setError(""); setShowRecord(true); }}>
                          <IconUsers class="h-4 w-4" />
                          {t("meals.studentRecord")}
                        </Button>
                        <Button variant="outline" size="sm" class="flex-1 sm:flex-none" onClick={() => { setError(""); setShowMenuEdit(true); }}>
                          <IconEdit class="h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[{ label: t("meals.deleteMenu"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteMenuOpen(true) }]}
                        />
                      </div>
                    ) : undefined
                  }
                />
                <dl class="mt-1 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border-hairline pt-3 sm:flex sm:flex-wrap sm:gap-x-10">
                  <MealFact label={t("meals.total")}>{formatTry(total(), moneyLocale())}</MealFact>
                  <MealFact label={bookedCount() != null ? `${t("meals.reservations")} / ${t("meals.capacity")}` : t("meals.capacity")}>
                    <Show when={bookedCount() != null} fallback={capacityLabel()}>
                      {t("meals.reservedOf", { count: bookedCount()!, capacity: capacityLabel() })}
                    </Show>
                  </MealFact>
                  <MealFact label={t("meals.cutoff")}>{cutoff() == null ? t("meals.noCutoff") : formatDateTime(cutoff(), locale())}</MealFact>
                  <MealFact label={t("meals.bookingStatus")}>
                    <Badge variant={cutoffClosed() ? "secondary" : "success"}>{cutoffClosed() ? t("meals.closed") : t("meals.open")}</Badge>
                  </MealFact>
                </dl>
              </section>

              <Show when={limits.error}><ErrorAlert message={formatApiError(limits.error)} onRetry={() => void refetchLimits()} /></Show>
              <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
              <Show when={success()}><Alert variant="success">{success()}</Alert></Show>

              <div class={isStudent() || isParent() ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" : undefined}>
                <MealDishList
                  dishes={current().dishes}
                  moneyLocale={moneyLocale()}
                  canManage={canManage()}
                  onAdd={() => openDish()}
                  onEdit={openDish}
                  onDelete={setDeleteDish}
                />
                <Show when={isStudent() || isParent()}>
                  <aside class="space-y-5">
                    <MealBookingCard
                      isParent={isParent()}
                      children={children()?.items ?? []}
                      selectedChild={selectedStudent()}
                      onSelectChild={setSelectedStudent}
                      canBook={canBook()}
                      booked={!!activeBooking()}
                      cutoffClosed={cutoffClosed()}
                      pending={pending()}
                      onBook={() => void book()}
                      onCancel={() => setCancelOpen(true)}
                    />
                    <Show when={canBook()}>
                      <MealAccountCard
                        showBalance={canReadMoney()}
                        balanceMinor={balance()?.balance_minor}
                        profile={profile()}
                        moneyLocale={moneyLocale()}
                      />
                    </Show>
                  </aside>
                </Show>
              </div>

              <Show when={canBook()}>
                <div class="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <Show when={canReadMoney()}>
                    <MealLedgerTable items={ledger()?.items ?? []} locale={locale()} moneyLocale={moneyLocale()} />
                  </Show>
                  <MealAttendanceTable items={attendance()?.items ?? []} locale={locale()} />
                </div>
              </Show>

              <Show when={canServe()}>
                <Show when={serviceAttendance.error || serviceBookings.error}>
                  <ErrorAlert message={formatApiError(serviceAttendance.error || serviceBookings.error)} onRetry={() => void refetchService()} />
                </Show>
                <MealServiceTable
                  entries={serviceEntries()}
                  canManage={canManage()}
                  pending={pending()}
                  onMark={(studentId, status) => void mark(studentId, status)}
                  onCancelBooking={setCancelBooking}
                  onAddWalkIn={() => { setError(""); setShowWalkIn(true); }}
                />
              </Show>

              <ConfirmDialog
                open={cancelOpen()}
                onOpenChange={setCancelOpen}
                title={t("meals.cancelBooking")}
                variant="destructive"
                summary={t("meals.cancelSummary")}
                onConfirm={() => confirmRun(async () => {
                  const booking = activeBooking();
                  if (!booking) return;
                  await deleteMealBookingById(booking.id);
                  await refreshAccount();
                }, t("meals.cancelled"))}
              />
              <ConfirmDialog
                open={cancelBooking() !== null}
                onOpenChange={(open) => !open && setCancelBooking(null)}
                title={t("meals.cancelBooking")}
                variant="destructive"
                summary={cancelBooking() ? `${t("meals.cancelSummary")} · ${personLabel(cancelBooking()!.student)}` : ""}
                onConfirm={() => confirmRun(async () => {
                  const booking = cancelBooking();
                  if (!booking) return;
                  await deleteMealBookingById(booking.id);
                  setCancelBooking(null);
                  await refetchService();
                }, t("meals.cancelled"))}
              />
              <ConfirmDialog
                open={deleteMenuOpen()}
                onOpenChange={setDeleteMenuOpen}
                title={t("meals.deleteMenu")}
                variant="destructive"
                summary={heading()}
                onConfirm={() => confirmRun(async () => {
                  await deleteMealMenuById(id());
                  void navigate({ to: "/meals" });
                }, t("common.deleted"))}
              />
              <ConfirmDialog
                open={deleteDish() !== null}
                onOpenChange={(open) => !open && setDeleteDish(null)}
                title={t("meals.deleteDish")}
                variant="destructive"
                summary={deleteDish()?.name ?? ""}
                onConfirm={() => confirmRun(async () => {
                  const dish = deleteDish();
                  if (!dish) return;
                  await deleteMealDishById(dish.id);
                  setDeleteDish(null);
                  await refetchMenu();
                }, t("common.deleted"))}
              />

              <MealMenuEditPanel
                open={showMenuEdit()}
                onOpenChange={setShowMenuEdit}
                description={heading()}
                capacity={current().capacity}
                maxCapacity={limits()?.meal.max_menu_capacity}
                pending={pending()}
                error={error()}
                onSave={(capacity) => run(async () => {
                  await patchMealMenuById(id(), { capacity });
                  await refetchMenu();
                })}
              />
              <MealDishPanel
                open={showDishForm()}
                onOpenChange={setShowDishForm}
                dish={editingDish()}
                description={heading()}
                dietaryTags={settings()?.dietary_tags ?? []}
                limits={limits()}
                pending={pending()}
                error={error()}
                onSave={saveDish}
              />
              <Show when={canServe()}>
                <MealWalkInPanel
                  open={showWalkIn()}
                  onOpenChange={setShowWalkIn}
                  description={heading()}
                  pending={pending()}
                  error={error()}
                  onSubmit={(studentId) => mark(studentId, "served")}
                />
              </Show>
              <Show when={canManage()}>
                <MealStudentRecordPanel
                  open={showRecord()}
                  onOpenChange={setShowRecord}
                  studentId={lookupStudent()}
                  onStudentChange={setLookupStudent}
                  profile={lookupStudent() ? profile() : null}
                  balanceMinor={lookupStudent() ? balance()?.balance_minor : undefined}
                  dietaryTags={settings()?.dietary_tags ?? []}
                  limits={limits()}
                  isAdmin={isAdmin()}
                  moneyLocale={moneyLocale()}
                  pending={pending()}
                  error={error()}
                  onSaveProfile={saveProfile}
                  onRecordCredit={recordCredit}
                />
              </Show>
            </div>
          );
        }}
      </Show>
    </Suspense>
  );
}
