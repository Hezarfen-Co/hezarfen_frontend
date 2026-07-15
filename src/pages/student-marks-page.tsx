import { Show, Suspense, createResource, createSignal } from "solid-js";
import { getUserMarks } from "@/api/getUserMarks";
import { formatApiError } from "@/api/client";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

export default function StudentMarksPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentMarksContent />
    </RouteGuard>
  );
}

function StudentMarksContent() {
  const t = useT();
  const [userId, setUserId] = createSignal("");
  const [lookupId, setLookupId] = createSignal<string | null>(null);
  const [report] = createResource(lookupId, async (id) => {
    if (!id) return null;
    return getUserMarks(id);
  });

  return (
    <div class="space-y-6">
      <PageHeader
        accent="violet"
        eyebrow={t("nav.admin")}
        title={t("nav.studentMarks")}
        description={t("marks.lookup")}
      />

      <section class="data-shell space-y-4 p-4">
        <div>
          <h2 class="font-display text-lg font-semibold">{t("nav.studentMarks")}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("marks.lookup")}</p>
        </div>
        <form
          class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const id = userId().trim();
            if (!id) return;
            setLookupId(id);
          }}
        >
          <UserSearchSelect
            id="student-marks-user"
            label={t("marks.userIdentity")}
            value={userId()}
            onChange={setUserId}
            placeholder={t("common.searchPlaceholder")}
            selectPlaceholder={t("marks.userIdentity")}
            emptyMessage={t("admin.noUsers")}
            allowManualValue
            role="student"
          />
          <Button type="submit" class="h-9 w-full rounded-sm sm:w-auto">{t("marks.show")}</Button>
        </form>

        <Show when={report.error}>
          <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formatApiError(report.error)}
          </p>
        </Show>
      </section>

      <Suspense fallback={<PageSpinner />}>
        <Show when={report()}>
          {(r) => (
            <div class="space-y-4">
              <p class="data-shell px-4 py-3 text-sm text-muted-foreground">
                {t("marks.forUser", { user: lookupId() ?? "" })}
              </p>
              <MarksReportView report={r()} />
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
