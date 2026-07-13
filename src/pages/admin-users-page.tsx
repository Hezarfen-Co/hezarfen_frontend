import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getUsers } from "@/api/getUsers";
import { patchUserRole } from "@/api/patchUserRole";
import { formatApiError } from "@/api/client";
import type { Role } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { UserTable } from "@/components/users/user-table";
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
  const [selectedUserId, setSelectedUserId] = createSignal("");
  const visibleUsers = createMemo(() => {
    const list = users() ?? [];
    const id = selectedUserId().trim();
    if (!id) return list;
    return list.filter((user) => user.id === id);
  });

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

      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <div class="surface-card space-y-4 p-5">
        <div>
          <h2 class="font-display text-lg font-semibold">{t("nav.users")}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <UserSearchSelect
          id="admin-user-search"
          label={t("common.search")}
          value={selectedUserId()}
          onChange={setSelectedUserId}
          placeholder={t("common.searchPlaceholder")}
          selectPlaceholder={t("admin.username")}
          emptyMessage={t("admin.noUsers")}
        />
        <Suspense fallback={<PageSpinner />}>
          <Show when={users()}>
            <Show
              when={visibleUsers().length > 0}
              fallback={
                <div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("admin.noUsers")}
                </div>
              }
            >
              <UserTable
                users={visibleUsers()}
                currentUserId={auth.user()!.id}
                onRoleChange={onRoleChange}
              />
            </Show>
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
