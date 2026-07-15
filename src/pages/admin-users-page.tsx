import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getUsers } from "@/api/getUsers";
import { patchUserRole } from "@/api/patchUserRole";
import { formatApiError } from "@/api/client";
import type { Role } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { UserTable } from "@/components/users/user-table";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty, DataTableSkeleton } from "@/components/ui/data-table";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import type { MessageKey } from "@/i18n/messages";
import { ROLES } from "@/lib/roles";

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
  const roleCount = (role: Role) => users()?.filter((user) => user.role === role).length ?? 0;

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
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.group.students")}</span>
          <span>/</span>
          <span>{t("nav.users")}</span>
        </div>
        <PageHeader accent="violet" eyebrow={t("nav.users")} title={t("admin.title")} description={t("admin.subtitle")} />
      </div>

      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label={t("common.all")} value={users()?.length ?? 0} />
        <For each={ROLES}>{(role) => <Metric label={t(`role.${role}` as MessageKey)} value={roleCount(role)} />}</For>
      </section>

      <div class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("nav.users")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{visibleUsers().length} / {users()?.length ?? 0}</p>
          </div>
          <Badge variant="outline" class="mono rounded-sm uppercase tracking-[0.08em]">{t("admin.directory")}</Badge>
        </div>
        <DataToolbar
          filters={
            <div class="min-w-0 flex-1 sm:max-w-sm">
              <UserSearchSelect
                id="admin-user-search"
                value={selectedUserId()}
                onChange={setSelectedUserId}
                placeholder={t("common.searchPlaceholder")}
                selectPlaceholder={t("admin.username")}
                emptyMessage={t("admin.noUsers")}
              />
            </div>
          }
        />
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={users()}>
            <Show
              when={visibleUsers().length > 0}
              fallback={<DataTableEmpty>{t("admin.noUsers")}</DataTableEmpty>}
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

function Metric(props: { label: string; value: number }) {
  return (
    <article class="data-shell p-4">
      <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{props.label}</p>
      <p class="mono mt-2 text-2xl font-semibold tabular-nums">{props.value}</p>
    </article>
  );
}
