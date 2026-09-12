import { useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { getUsers } from "@/api/users";
import { patchUserRole } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserTable } from "@/components/users/user-table";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { Alert } from "@/components/ui/alert";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { createFlash } from "@/lib/flash";
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
  const navigate = useNavigate();
  const t = useT();
  const [error, setError] = createSignal("");
  const [selectedParent, setSelectedParent] = createSignal<User | null>(null);

  const [list, { refetch }] = createResource(async () => (await getUsers({ limit: 200 })).items);
  const visibleUsers = () => list() ?? [];
  const roleCount = (role: Role) => visibleUsers().filter((user) => user.role === role).length;

  const [flash, setFlash] = createFlash();

  const onRoleChange = async (userId: string, role: Role) => {
    setError("");
    try {
      await patchUserRole(userId, role);
      await refetch();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader eyebrow={t("nav.users")} title={t("admin.title")} description={t("admin.subtitle")} />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <For each={ROLES}>{(role) => <Metric role={role} label={t(`role.${role}` as MessageKey)} value={roleCount(role)} />}</For>
      </section>

      <div class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={list()}>
            <UserTable
              users={visibleUsers() as User[]}
              currentUserId={auth.user()!.id}
              onRoleChange={onRoleChange}
              onUserClick={(user) => navigate({ to: "/admin/users/$id", params: { id: user.id } })}
              onParentClick={setSelectedParent}
            />
          </Show>
        </Suspense>
      </div>
      <Show when={selectedParent()} keyed>
        {(u) => (
          <ParentStudentsPanel 
            parent={{ id: u.id, username: u.username, display_name: [u.name, u.surname].filter(Boolean).join(" ") || u.username }} 
            open 
            onOpenChange={() => setSelectedParent(null)} 
          />
        )}
      </Show>
    </div>
  );
}

function Metric(props: { role: Role; label: string; value: number }) {
  return (
    <article class="data-shell p-4">
      <p class="text-xs font-medium text-text-subtle">{props.label}</p>
      <p class="mono mt-2 text-2xl font-semibold tabular-nums">{props.value}</p>
    </article>
  );
}
