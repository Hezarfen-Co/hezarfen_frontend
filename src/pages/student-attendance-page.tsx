import { Show, Suspense, createResource, createSignal } from "solid-js";
import { getUserAttendance } from "@/api/getUserAttendance";
import { formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/types";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export default function StudentAttendancePage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentAttendanceContent />
    </RouteGuard>
  );
}

function StudentAttendanceContent() {
  const t = useT();
  const [userId, setUserId] = createSignal("");
  const [selectedUser, setSelectedUser] = createSignal<PersonRef | null>(null);
  const [lookupId, setLookupId] = createSignal<string | null>(null);
  const [lookupLabel, setLookupLabel] = createSignal("");
  const [report, { refetch }] = createResource(lookupId, async (id) => {
    if (!id) return null;
    return getUserAttendance(id);
  });

  return (
    <div class="space-y-6">
      <PageHeader accent="sky" eyebrow={t("nav.admin")} title={t("nav.studentAttendance")} description={t("attendance.lookup")} />

      <section class="data-shell space-y-4 p-4">
        <div>
          <h2 class="font-display text-lg font-semibold">{t("nav.studentAttendance")}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("attendance.lookup")}</p>
        </div>
        <form
          class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const id = userId().trim();
            if (!id) return;
            setLookupId(id);
            setLookupLabel(personLabel(selectedUser()) === "—" ? id : personLabel(selectedUser()));
          }}
        >
          <UserSearchSelect
            id="student-attendance-user"
            label={t("marks.userIdentity")}
            value={userId()}
            onChange={setUserId}
            onSelectUser={setSelectedUser}
            placeholder={t("common.searchPlaceholder")}
            selectPlaceholder={t("marks.userIdentity")}
            emptyMessage={t("form.noStudents")}
            allowManualValue
            role="student"
          />
          <Button type="submit" class="h-9 w-full rounded-lg sm:w-auto">{t("attendance.show")}</Button>
        </form>

        <Show when={report.error}>
          <ErrorAlert message={formatApiError(report.error)} onRetry={() => void refetch()} />
        </Show>
      </section>

      <Suspense fallback={<PageSpinner />}>
        <Show when={report()}>
          {(r) => (
            <div class="space-y-4">
              <p class="data-shell px-4 py-3 text-sm text-muted-foreground">
                {t("attendance.forUser", { user: lookupLabel() || lookupId() || "" })}
              </p>
              <AttendanceReportView report={r()} />
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
