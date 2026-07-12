import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { getEvents } from "@/api/getEvents";
import { postEvent } from "@/api/postEvent";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EventForm } from "@/components/events/event-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

export default function EventsPage() {
  return (
    <RouteGuard>
      <EventsContent />
    </RouteGuard>
  );
}

function EventsContent() {
  const auth = useAuth();
  const t = useT();
  const [events, { refetch }] = createResource(() => getEvents());
  const [error, setError] = createSignal("");
  const [showForm, setShowForm] = createSignal(false);
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher");

  return (
    <div class="space-y-6">
      <PageHeader
        accent="sky"
        eyebrow={t("nav.events")}
        title={t("events.title")}
        description={t("events.subtitle")}
        actions={
          canCreate() ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm() ? t("common.cancel") : t("events.create")}
            </Button>
          ) : undefined
        }
      />

      <CollapsibleHelp title={t("events.helpTitle")}>{t("events.helpBody")}</CollapsibleHelp>

      <Show when={canCreate() && showForm()}>
        <section class="surface-card max-w-2xl p-5 animate-fade-up">
          <h2 class="mb-4 font-display text-lg font-semibold">{t("events.create")}</h2>
          <EventForm
            submitLabel={t("common.create")}
            onSubmit={async (values) => {
              setError("");
              try {
                const body: {
                  title: string;
                  description?: string;
                  starts_at?: number | null;
                  ends_at?: number | null;
                } = { title: values.title };
                if (values.description) body.description = values.description;
                if (values.starts_at !== undefined) body.starts_at = values.starts_at;
                if (values.ends_at !== undefined) body.ends_at = values.ends_at;
                await postEvent(body);
                setShowForm(false);
                await refetch();
              } catch (err) {
                setError(formatApiError(err));
                throw err;
              }
            }}
          />
        </section>
      </Show>

      {error() && <p class="text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={events.error}>
          <Alert variant="destructive">{formatApiError(events.error)}</Alert>
        </Show>
        <Show when={events()}>
          {(list) => (
            <Show
              when={list().length > 0}
              fallback={
                <div class="rounded-sm border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
                  {t("events.empty")}
                </div>
              }
            >
              <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <For each={list()}>
                  {(event) => (
                    <li class="animate-fade-up">
                      <EventCard event={event} />
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
