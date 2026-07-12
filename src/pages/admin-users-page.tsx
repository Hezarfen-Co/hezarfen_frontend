import { Show, Suspense, createResource, createSignal } from "solid-js";
import { getUsers } from "@/api/getUsers";
import { patchUserRole } from "@/api/patchUserRole";
import { formatApiError } from "@/api/client";
import type { Role } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserTable } from "@/components/users/user-table";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function AdminUsersPage() {
  return (
    <RouteGuard minRole="admin">
      <AdminUsersContent />
    </RouteGuard>
  );
}

function AdminUsersContent() {
  const auth = useAuth();
  const t = useT();
  const [users, { refetch }] = createResource(() => getUsers());
  const [error, setError] = createSignal("");

  const onRoleChange = async (userId: string, role: Role) => {
    setError("");
    try {
      await patchUserRole(userId, role);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader
        accent="violet"
        eyebrow={t("nav.users")}
        title={t("admin.title")}
        description={t("admin.subtitle")}
      />

      <CollapsibleHelp title={t("admin.helpTitle")}>{t("admin.helpBody")}</CollapsibleHelp>

      {error() && (
        <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
      )}

      <div class="surface-card overflow-hidden p-2 sm:p-4">
        <Suspense fallback={<PageSpinner />}>
          <Show when={users()}>
            {(list) => (
              <Show
                when={list().length > 0}
                fallback={
                  <div class="rounded-sm border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
                    {t("admin.noUsers")}
                  </div>
                }
              >
                <UserTable
                  users={list()}
                  currentUserId={auth.user()!.id}
                  onRoleChange={onRoleChange}
                />
              </Show>
            )}
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
