import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteEventAttendanceByUserId } from "@/api/deleteEventAttendanceByUserId";
import { deleteEventById } from "@/api/deleteEventById";
import { getEventAttendance } from "@/api/getEventAttendance";
import { getEventById } from "@/api/getEventById";
import { patchEventById } from "@/api/patchEventById";
import { postEventAttendance } from "@/api/postEventAttendance";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus } from "@/api/types";
import { AttendanceStatusPicker } from "@/components/events/attendance-status-picker";
import { AttendanceTable } from "@/components/events/attendance-table";
import { EventForm } from "@/components/events/event-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronLeft, IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SectionDisclosure } from "@/components/ui/section-disclosure";
import { SidePanel } from "@/components/ui/side-panel";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function EventDetailPage() {
  return (
    <RouteGuard>
      <EventDetailContent />
    </RouteGuard>
  );
}

function EventDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/events/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  const [status, setStatus] = createSignal<AttendanceStatus>("present");
  const [otherUserId, setOtherUserId] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [attendanceOpen, setAttendanceOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");

  const [event, { refetch: refetchEvent }] = createResource(id, (eventId) => getEventById(eventId));
  const [attendance, { refetch: refetchAttendance }] = createResource(
    () => (isTeacherPlus() && attendanceOpen() ? id() : null),
    async (eventId) => (eventId ? (await getEventAttendance(eventId)).items : []),
  );

  const canManage = () => {
    const e = event();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };
  const wrap = async (fn: () => Promise<void>) => {
    setError("");
    setPending(true);
    try {
      await fn();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={event()?.id === id() ? event() : undefined}
        fallback={
          <Show when={event.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(event.error)}</Alert>
          </Show>
        }
      >
        {(ev) => (
          <div class="space-y-6">
            <div class="space-y-2">
              <div class="detail-breadcrumb">
                <span>{t("nav.group.classes")}</span>
                <span>/</span>
                <Link to="/events">{t("events.title")}</Link>
                <span>/</span>
                <span class="truncate">{ev().title}</span>
              </div>
              <PageHeader
                accent="sky"
                eyebrow={t("events.title")}
                title={ev().title}
                description={`${formatDateTime(ev().starts_at, locale())} → ${formatDateTime(ev().ends_at, locale())}`}
                actions={
                  <div class="detail-action-group">
                  <Link to="/events">
                    <Button variant="ghost" size="sm" class="w-full rounded-sm sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={canManage()}>
                    <div class="detail-action-divider">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="flex-1 rounded-sm sm:flex-none"
                        onClick={() => setEditing(true)}
                      >
                        <IconEdit class="h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="flex-1 rounded-sm sm:flex-none"
                        disabled={pending()}
                        onClick={() => setDeleteOpen(true)}
                      >
                        <IconTrash class="h-4 w-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </Show>
                </div>
                }
              >
              <p class="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
                {ev().description || "—"}
              </p>
              </PageHeader>
            </div>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.deleteEvent", { title: ev().title })}
              onConfirm={async () => {
                await wrap(async () => {
                  await deleteEventById(id());
                  void navigate({ to: "/events" });
                });
              }}
            />

            <SidePanel
              open={editing()}
              onOpenChange={setEditing}
              title={t("common.edit")}
              description={ev().title}
            >
              <EventForm
                initial={ev()}
                submitLabel={t("common.update")}
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  const body: Record<string, unknown> = {
                    title: values.title,
                    description: values.description,
                  };
                  if (values.starts_at !== undefined) body.starts_at = values.starts_at;
                  if (values.ends_at !== undefined) body.ends_at = values.ends_at;
                  await patchEventById(id(), body);
                  setEditing(false);
                  await refetchEvent();
                }}
              />
            </SidePanel>

            <div class="grid gap-4 lg:grid-cols-2">
              <section class="data-shell p-4">
                <div>
                  <h2 class="font-display text-lg font-semibold">{t("events.markSelf")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{t("events.status")}</p>
                </div>
                <div class="mt-4 space-y-3">
                  <AttendanceStatusPicker value={status()} onChange={setStatus} label={t("events.status")} />
                  <Button
                    type="button"
                    class="w-full rounded-sm sm:w-auto"
                    disabled={pending()}
                    onClick={() =>
                      void wrap(async () => {
                        await postEventAttendance(id(), { status: status() });
                        if (attendanceOpen()) await refetchAttendance();
                      })
                    }
                  >
                    {t("events.markSelf")}
                  </Button>
                </div>
              </section>

              <Show when={isTeacherPlus()}>
                <section class="data-shell p-4">
                  <div>
                    <h2 class="font-display text-lg font-semibold">{t("events.markOther")}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">{t("events.userId")}</p>
                  </div>
                  <div class="mt-4 grid gap-3">
                    <UserSearchSelect
                      id="other-user"
                      label={t("events.userId")}
                      value={otherUserId()}
                      placeholder={t("form.selectStudent")}
                      onChange={setOtherUserId}
                    />
                    <AttendanceStatusPicker
                      id="other-status"
                      value={status()}
                      onChange={setStatus}
                      label={t("events.status")}
                    />
                    <Button
                      type="button"
                      class="w-full rounded-sm sm:w-auto"
                      disabled={pending()}
                      onClick={() =>
                        void wrap(async () => {
                          const uid = otherUserId().trim();
                          if (!uid) {
                            setError(t("events.userIdRequired"));
                            return;
                          }
                          await postEventAttendance(id(), {
                            status: status(),
                            user_id: uid,
                          });
                          setOtherUserId("");
                          if (attendanceOpen()) await refetchAttendance();
                        })
                      }
                    >
                      {t("events.markOther")}
                    </Button>
                  </div>
                </section>
              </Show>
            </div>

            {error() && (
              <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <Show when={isTeacherPlus()}>
              <SectionDisclosure
                open={attendanceOpen()}
                onToggle={() => setAttendanceOpen((open) => !open)}
                title={t("events.attendance")}
                description={t("events.markedBy")}
              >
                <Suspense fallback={<PageSpinner />}>
                  <Show when={attendance()}>
                    {(rows) => (
                      <AttendanceTable
                        rows={rows()}
                        emptyLabel={t("events.noAttendance")}
                        canRemove={isTeacherPlus()}
                        onRemove={async (userId) => {
                          await wrap(async () => {
                            await deleteEventAttendanceByUserId(id(), userId);
                            await refetchAttendance();
                          });
                        }}
                      />
                    )}
                  </Show>
                </Suspense>
              </SectionDisclosure>
            </Show>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
