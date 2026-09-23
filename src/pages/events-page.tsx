import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteEventById, getEvents } from "@/api/events";
import { postEvent } from "@/api/events";
import { formatApiError } from "@/api/client";
import type { Event, EventAudience } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventEditPanel } from "@/components/events/event-edit-panel";
import { EventForm } from "@/components/events/event-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RouteGuard } from "@/components/layout/route-guard";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { TruncationNotice } from "@/components/ui/truncation-notice";
import { cn } from "@/lib/cn";
import { createUrlEnum } from "@/lib/url-state";
import { createNow } from "@/lib/create-now";
import { LIST_CAP, loadCappedList } from "@/lib/capped-list";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { matchesSearch } from "@/lib/search-text";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EVENT_PAGE_SIZE = 10;

export default function EventsPage() {
  return (
    <RouteGuard>
      <EventsContent />
    </RouteGuard>
  );
}

function EventsContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = usePreferences();
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [showForm, setShowForm] = createSignal(location().searchStr.includes("action=new"));
  createEffect(() => {
    if (location().searchStr.includes("action=new")) {
      setShowForm(true);
    }
  });
  const [timeFilter, setTimeFilter] = createUrlEnum("when", ["all", "upcoming", "past"] as const, "all");
  const now = createNow();
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

  const filterEvents = (items: Event[]) => {
    const scope = timeFilter();
    const nowMs = now();
    const isPast = (event: Event) => event.ends_at != null && event.ends_at < nowMs;
    const at = (event: Event) => event.starts_at ?? event.ends_at ?? null;
    // Default order, before any header sort: what is still ahead comes first,
    // soonest first; what is over follows, most recent first. The API lists
    // newest first, which put a far-off event above next week's.
    const byDefault = (a: Event, b: Event) => {
      const pastA = isPast(a);
      const pastB = isPast(b);
      if (pastA !== pastB) return pastA ? 1 : -1;
      const atA = at(a);
      const atB = at(b);
      if (atA == null || atB == null) return atA == null ? (atB == null ? 0 : 1) : -1;
      return pastA ? atB - atA : atA - atB;
    };
    return items
      .filter((event) => {
        if (scope === "upcoming" && isPast(event)) return false;
        if (scope === "past" && !isPast(event)) return false;
        return true;
      })
      .sort(byDefault);
  };

  const [loadAll, setLoadAll] = createSignal(false);
  const [list, { refetch }] = createResource(
    () => (loadAll() ? "all" : "capped"),
    (scope) => loadCappedList(getEvents, LIST_CAP, scope === "all"),
  );
  const rows = createMemo(() => filterEvents(list()?.items ?? []));

  // The detail page's header actions, from the row menu. Same rights as there:
  // the event's creator or a manager+.
  const canManage = (event: Event) => {
    const u = auth.user();
    return !!u && (event.creator === u.id || hasMinRole(u.role, "manager"));
  };
  const [editTarget, setEditTarget] = createSignal<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Event | null>(null);
  const refreshList = async () => {
    try { await refetch(); } catch { /* stale rows until the next load */ }
  };
  const eventStatus = (event: Event) => {
    const nowMs = now();
    if (event.ends_at != null && event.ends_at < nowMs) return "past";
    if (event.starts_at != null && event.starts_at > nowMs) return "upcoming";
    return "active";
  };
  const statusLabel = (status: string) => status === "past" ? t("events.past") : status === "upcoming" ? t("events.upcoming") : t("exams.active");
  const audienceLabel = (audience: EventAudience) => {
    if (audience.kind === "school") return t("events.audience.school");
    if (audience.kind === "role") return t("events.audience.role");
    if (audience.kind === "course") return t("events.audience.course");
    return t("events.audience.registration");
  };
  const searchEvent = (event: Event, query: string) =>
    matchesSearch(
      query,
      event.title,
      event.description,
      audienceLabel(event.audience),
      formatDateTime(event.starts_at, locale()),
      formatDateTime(event.ends_at, locale()),
    );
  const columns = createMemo<ColumnDef<Event>[]>(() => [
    {
      accessorKey: "title",
      header: t("events.title"),
      size: 220,
      minSize: 180,
      cell: (cell) => (
        <div class="min-w-0">
          <Link to="/events/$id" params={{ id: cell.row.original.id }} class="truncate font-medium hover:text-primary-text hover:underline">
            {cell.row.original.title}
          </Link>
        </div>
      ),
    },
    {
      id: "time",
      accessorFn: (event) => event.starts_at ?? event.ends_at ?? 0,
      header: t("events.starts"),
      size: 190,
      minSize: 160,
      meta: { cellClass: "text-xs text-muted-foreground" },
      cell: (cell) => (
        <div class="whitespace-nowrap">
          <p>{formatDateTime(cell.row.original.starts_at, locale())}</p>
          <Show when={cell.row.original.ends_at}>
            <p class="text-[11px]">→ {formatDateTime(cell.row.original.ends_at, locale())}</p>
          </Show>
        </div>
      ),
    },
    {
      id: "audience",
      accessorFn: (event) => audienceLabel(event.audience),
      header: t("events.audience"),
      size: 140,
      minSize: 120,
      cell: (cell) => <Badge variant="outline" class="rounded-full">{audienceLabel(cell.row.original.audience)}</Badge>,
    },
    {
      id: "status",
      accessorFn: (event) => statusLabel(eventStatus(event)),
      header: t("attempt.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => {
        const status = eventStatus(cell.row.original);
        return (
          <Badge variant="outline" class={cn("w-28 justify-center rounded-full", scheduleStatusClass(status))}>
            <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(status))} />
            {statusLabel(status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => void navigate({ to: "/events/$id", params: { id: cell.row.original.id } }),
            },
            ...(canManage(cell.row.original)
              ? [
                  { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => setEditTarget(cell.row.original) },
                  { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
                ]
              : []),
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <SidePanel guardUnsaved open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("events.create")} description={t("events.subtitle")}>
        <EventForm
          submitLabel={t("common.create")}
          onCancel={() => setShowForm(false)}
          onSubmit={async (values) => {
            setError("");
            try {
              const body: {
                title: string;
                description?: string;
                starts_at?: number;
                ends_at?: number;
                audience?: EventAudience;
              } = { title: values.title };
              if (values.description) body.description = values.description;
              body.audience = values.audience;
              if (values.starts_at != null) body.starts_at = values.starts_at;
              if (values.ends_at != null) body.ends_at = values.ends_at;
              await postEvent(body);
              setShowForm(false);
              await refetch();
              setFlash(t("common.created"));
            } catch (err) {
              setError(formatApiError(err));
              throw err;
            }
          }}
        />
      </SidePanel>

      <EventEditPanel
        event={editTarget()}
        open={editTarget() !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSaved={async () => { await refreshList(); setFlash(t("common.saved")); }}
      />

      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.deleteEvent", { title: deleteTarget()?.title ?? "" })}
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          setError("");
          try {
            await deleteEventById(target.id);
            setDeleteTarget(null);
            setFlash(t("common.deleted"));
            await refreshList();
          } catch (err) {
            setDeleteTarget(null);
            setError(formatApiError(err));
          }
        }}
      />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !showForm()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <section class="space-y-4 p-0">
        <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <TruncationNotice
            shown={list()?.items.length ?? 0}
            total={list()?.total ?? 0}
            loading={list.loading}
            onLoadAll={() => setLoadAll(true)}
          />
          <DataTable
            urlState
            title={t("events.title")}
            description={t("events.subtitle")}
            actions={
              canCreate() ? (
                <Button type="button" size="sm" class="min-w-30" onClick={() => setShowForm(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("events.create")}
                </Button>
              ) : undefined
            }
            columns={columns()}
            data={rows()}
            tableClass="table-fixed min-w-[42rem]"
            searchPredicate={searchEvent}
            filterHint={t("search.hint.events")}
            enablePagination
            pageSize={EVENT_PAGE_SIZE}
            empty={t("events.empty")}
            pageResetKey={timeFilter()}
            filtersActive={timeFilter() !== "all"}
            onClearFilters={() => setTimeFilter("all")}
            storageKey="events"
            onRowClick={(event) => void navigate({ to: "/events/$id", params: { id: event.id } })}
            filters={
              <DropdownSelect
                labelPrefix={t("attempt.status")}
                value={timeFilter()}
                onChange={(val) => setTimeFilter(val === "upcoming" || val === "past" ? val : "all")}
                options={[
                  { value: "all", label: t("common.all") },
                  { value: "upcoming", label: t("events.upcoming") },
                  { value: "past", label: t("events.past") },
                ]}
              />
            }
          />
        </Suspense>
      </section>
    </div>
  );
}
