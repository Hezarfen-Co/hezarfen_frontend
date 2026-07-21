import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getEvents } from "@/api/events";
import { postEvent } from "@/api/events";
import { formatApiError } from "@/api/client";
import type { Event, EventAudience } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/events/event-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
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
  const { locale } = usePreferences();
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [showForm, setShowForm] = createSignal(false);
  const [timeFilter, setTimeFilter] = createSignal("all");
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

  const filterEvents = (items: Event[]) => {
    const scope = timeFilter();
    const now = Date.now();
    return items.filter((event) => {
      if (scope === "upcoming" && event.ends_at != null && event.ends_at < now) return false;
      if (scope === "past" && (event.ends_at == null || event.ends_at >= now)) return false;
      return true;
    });
  };

  const [list, { refetch }] = createResource(async () => (await getEvents()).items);
  const rows = () => filterEvents(list() ?? []);
  const eventStatus = (event: Event) => {
    const now = Date.now();
    if (event.ends_at != null && event.ends_at < now) return "past";
    if (event.starts_at != null && event.starts_at > now) return "upcoming";
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
    [event.title, event.description, audienceLabel(event.audience), formatDateTime(event.starts_at, locale()), formatDateTime(event.ends_at, locale())]
      .join(" ")
      .toLocaleLowerCase(locale())
      .includes(query.toLocaleLowerCase(locale()));
  const columns = createMemo<ColumnDef<Event>[]>(() => [
    {
      accessorKey: "title",
      header: t("events.title"),
      cell: (cell) => (
        <div class="min-w-0">
          <Link to="/events/$id" params={{ id: cell.row.original.id }} class="truncate font-medium hover:text-primary hover:underline">
            {cell.row.original.title}
          </Link>
          <p class="truncate text-xs text-muted-foreground">{cell.row.original.description || "—"}</p>
        </div>
      ),
    },
    {
      id: "starts_at",
      accessorFn: (event) => event.starts_at ?? 0,
      header: t("events.starts"),
      meta: { cellClass: "mono text-xs text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.starts_at, locale()),
    },
    {
      id: "ends_at",
      accessorFn: (event) => event.ends_at ?? 0,
      header: t("events.ends"),
      meta: { cellClass: "mono text-xs text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.ends_at, locale()),
    },
    {
      id: "audience",
      accessorFn: (event) => audienceLabel(event.audience),
      header: t("events.audience"),
      cell: (cell) => <Badge variant="outline" class="rounded-sm">{audienceLabel(cell.row.original.audience)}</Badge>,
    },
    {
      id: "status",
      accessorFn: (event) => statusLabel(eventStatus(event)),
      header: t("attempt.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => {
        const status = eventStatus(cell.row.original);
        return (
          <Badge variant="outline" class={cn("w-28 justify-center rounded-sm", scheduleStatusClass(status))}>
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
          actions={[{
            label: t("common.view"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => void navigate({ to: "/events/$id", params: { id: cell.row.original.id } }),
          }]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader
          accent="sky"
          eyebrow={t("nav.events")}
          title={t("events.title")}
          description={t("events.subtitle")}
          actions={
            canCreate() ? (
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setShowForm(true)}>
                <IconPlus class="h-4 w-4" />
                {t("events.create")}
              </Button>
            ) : undefined
          }
        />
      </div>

      <SidePanel open={canCreate() && showForm()} onOpenChange={setShowForm} title={t("events.create")} description={t("events.subtitle")}>
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

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <p class="text-sm text-destructive">{error()}</p>}

      <section class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <DataTable
            columns={columns()}
            data={rows()}
            tableClass="table-fixed min-w-[58rem]"
            searchPredicate={searchEvent}
            enablePagination
            pageSize={EVENT_PAGE_SIZE}
            empty={t("events.empty")}
            filters={
              <Select class="h-9 w-full rounded-sm sm:w-44" value={timeFilter()} aria-label={t("events.title")} onChange={(event) => setTimeFilter(event.currentTarget.value)}>
                <option value="all">{t("common.all")}</option>
                <option value="upcoming">{t("events.upcoming")}</option>
                <option value="past">{t("events.past")}</option>
              </Select>
            }
          />
        </Suspense>
      </section>
    </div>
  );
}
