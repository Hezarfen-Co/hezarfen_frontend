import { Link, useNavigate, useParams } from "@tanstack/solid-router";
import { Show, Suspense, createResource, createSignal } from "solid-js";
import { deleteEventAttendanceByUserId } from "@/api/deleteEventAttendanceByUserId";
import { deleteEventById } from "@/api/deleteEventById";
import { getEventAttendance } from "@/api/getEventAttendance";
import { getEventById } from "@/api/getEventById";
import { patchEventById } from "@/api/patchEventById";
import { postEventAttendance } from "@/api/postEventAttendance";
import { formatApiError, ApiError } from "@/api/client";
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
  const params = useParams({ from: "/events/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const id = () => params().id;

  const [event, { refetch: refetchEvent }] = createResource(id, (eventId) => getEventById(eventId));
  const [attendance, { refetch: refetchAttendance }] = createResource(id, (eventId) =>
    getEventAttendance(eventId),
  );

  const [status, setStatus] = createSignal<AttendanceStatus>("present");
  const [otherUserId, setOtherUserId] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const canManage = () => {
    const e = event();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };
  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");

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
        when={event()}
        fallback={
          <Show when={event.error}>
            <Alert variant="destructive">
              {event.error instanceof ApiError ? event.error.message : t("common.notFound")}
            </Alert>
          </Show>
        }
      >
        {(ev) => (
          <div class="space-y-6">
            <PageHeader
              accent="sky"
              eyebrow={t("events.title")}
              title={ev().title}
              description={`${formatDateTime(ev().starts_at, locale())} → ${formatDateTime(ev().ends_at, locale())}`}
              actions={
                <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1 shadow-sm sm:w-auto">
                  <Link to="/events">
                    <Button variant="ghost" size="sm" class="w-full rounded-md sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={canManage()}>
                    <div class="flex flex-1 items-center gap-1 border-t border-border pt-1 sm:ml-1 sm:flex-none sm:border-l sm:border-t-0 sm:pl-1 sm:pt-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="flex-1 rounded-md sm:flex-none"
                        onClick={() => setEditing((v) => !v)}
                      >
                        <IconEdit class="h-4 w-4" />
                        {editing() ? t("common.cancel") : t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="flex-1 rounded-md sm:flex-none"
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

            <Show when={editing()}>
              <section class="surface-card max-w-3xl p-5">
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
              </section>
            </Show>

            <div class="grid gap-4 lg:grid-cols-2">
              <section class="surface-card p-5">
                <div>
                  <h2 class="font-display text-lg font-semibold">{t("events.markSelf")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{t("events.status")}</p>
                </div>
                <div class="mt-4 space-y-3">
                  <AttendanceStatusPicker value={status()} onChange={setStatus} label={t("events.status")} />
                  <Button
                    type="button"
                    class="w-full rounded-md sm:w-auto"
                    disabled={pending()}
                    onClick={() =>
                      void wrap(async () => {
                        await postEventAttendance(id(), { status: status() });
                        await refetchAttendance();
                      })
                    }
                  >
                    {t("events.markSelf")}
                  </Button>
                </div>
              </section>

              <Show when={isTeacherPlus()}>
                <section class="surface-card p-5">
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
                      class="w-full rounded-md sm:w-auto"
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
                          await refetchAttendance();
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

            <section class="surface-card space-y-4 p-5">
              <div>
                <h2 class="font-display text-lg font-semibold">{t("events.attendance")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{t("events.markedBy")}</p>
              </div>
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
            </section>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
