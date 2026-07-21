import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { getUsers } from "@/api/users";
import { patchUserProfile } from "@/api/users";
import { patchUserRole } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/users/profile-form";
import { UserTable } from "@/components/users/user-table";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty, DataTableSkeleton } from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
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
  const t = useT();
  const [error, setError] = createSignal("");
  const [editUser, setEditUser] = createSignal<User | null>(null);
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
      <div class="space-y-2">
        <PageHeader accent="violet" eyebrow={t("nav.users")} title={t("admin.title")} description={t("admin.subtitle")} />
      </div>

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <For each={ROLES}>{(role) => <Metric label={t(`role.${role}` as MessageKey)} value={roleCount(role)} />}</For>
      </section>

      <div class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("nav.users")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {visibleUsers().length}
            </p>
          </div>
          <Badge variant="outline" class="mono rounded-sm uppercase tracking-[0.08em]">
            {t("admin.directory")}
          </Badge>
        </div>
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={list()}>
            <Show when={visibleUsers().length > 0} fallback={<DataTableEmpty>{t("admin.noUsers")}</DataTableEmpty>}>
              <UserTable 
                users={visibleUsers() as User[]} 
                currentUserId={auth.user()!.id} 
                onRoleChange={onRoleChange} 
                onUserClick={setEditUser}
                onParentClick={setSelectedParent}
              />
            </Show>
          </Show>
        </Suspense>
      </div>
      <Show when={editUser()} keyed>
        {(user) => (
          <FormDialog open onOpenChange={(open) => !open && setEditUser(null)} title={user.username} description={t("profile.subtitle")}>
            <ProfileForm
              user={user}
              onSave={(body) => patchUserProfile(user.id, body)}
              onSaved={async () => {
                await refetch();
                setEditUser(null);
                setFlash(t("common.saved"));
              }}
            />
          </FormDialog>
        )}
      </Show>

      <Show when={selectedParent()} keyed>
        {(u) => (
          <ParentStudentsPanel 
            parent={{ id: u.id, username: u.username, display_name: u.name || u.username }} 
            open 
            onOpenChange={() => setSelectedParent(null)} 
          />
        )}
      </Show>
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
