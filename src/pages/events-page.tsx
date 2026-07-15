import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getEvents } from "@/api/getEvents";
import { postEvent } from "@/api/postEvent";
import { formatApiError } from "@/api/client";
import type { Event } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EventForm } from "@/components/events/event-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { IconPlus } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDateTime } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EVENT_PAGE_SIZE = 9;

export default function EventsPage() {
  return (
    <RouteGuard>
      <EventsContent />
    </RouteGuard>
  );
}

function EventsContent() {
  const auth = useAuth();
  const { locale } = usePreferences();
  const t = useT();
  const [error, setError] = createSignal("");
  const [showForm, setShowForm] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [timeFilter, setTimeFilter] = createSignal("all");
  const [page, setPage] = createSignal(0);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");
  const clientFilterActive = () => query().trim() !== "" || timeFilter() !== "all";

  const filterEvents = (items: Event[]) => {
    const needle = query().trim().toLocaleLowerCase();
    const scope = timeFilter();
    const now = Date.now();
    return items.filter((event) => {
      if (scope === "upcoming" && event.ends_at != null && event.ends_at < now) return false;
      if (scope === "past" && (event.ends_at == null || event.ends_at >= now)) return false;
      if (!needle) return true;
      return [event.title, event.description, formatDateTime(event.starts_at, locale()), formatDateTime(event.ends_at, locale())]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle);
    });
  };

  const [list, { refetch }] = createResource(
    () => [page(), clientFilterActive() ? "1" : "0", query(), timeFilter()].join("|"),
    async () =>
      loadListPage({
        page: page(),
        pageSize: EVENT_PAGE_SIZE,
        clientMode: clientFilterActive(),
        fetch: getEvents,
        filter: filterEvents,
      }),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), EVENT_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.group.classes")}</span>
          <span>/</span>
          <span>{t("nav.events")}</span>
        </div>
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
              } = { title: values.title };
              if (values.description) body.description = values.description;
              if (values.starts_at != null) body.starts_at = values.starts_at;
              if (values.ends_at != null) body.ends_at = values.ends_at;
              await postEvent(body);
              setShowForm(false);
              await refetch();
            } catch (err) {
              setError(formatApiError(err));
              throw err;
            }
          }}
        />
      </SidePanel>

      {error() && <p class="text-sm text-destructive">{error()}</p>}

      <section class="data-shell space-y-4 p-4">
        <DataToolbar
          searchValue={query()}
          searchPlaceholder={t("common.searchPlaceholder")}
          onSearchInput={(value) => {
            setQuery(value);
            setPage(0);
          }}
          filters={
            <Select
              class="h-9 w-full rounded-sm sm:w-44"
              value={timeFilter()}
              aria-label={t("events.title")}
              onChange={(event) => {
                setTimeFilter(event.currentTarget.value);
                setPage(0);
              }}
            >
              <option value="all">{t("common.all")}</option>
              <option value="upcoming">{t("events.upcoming")}</option>
              <option value="past">{t("events.past")}</option>
            </Select>
          }
        />

        <Suspense fallback={<PageSpinner />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <Show when={list() !== undefined}>
            <Show
              when={pageItems().length > 0}
              fallback={
                <div class="rounded-sm border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
                  {t("events.empty")}
                </div>
              }
            >
              <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 class="font-display text-lg font-semibold">{t("events.title")}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {pageItems().length} / {total()} {t("nav.events")}
                    </p>
                  </div>
                </div>
                <ul class="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  <For each={pageItems()}>
                    {(event) => (
                      <li class="animate-fade-up">
                        <EventCard event={event} />
                      </li>
                    )}
                  </For>
                </ul>
                <Show when={total() > EVENT_PAGE_SIZE}>
                  <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
                </Show>
              </div>
            </Show>
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
