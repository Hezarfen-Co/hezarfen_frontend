import { useNavigate } from "@tanstack/solid-router";
import { Show, Suspense, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getUsers } from "@/api/users";
import { patchUserRole } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { UserTable } from "@/components/users/user-table";
import { CreateUserPanel } from "@/components/users/create-user-panel";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { AdminUserEditPanel } from "@/components/users/admin-user-edit-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { IconPlus } from "@/components/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadAllPages } from "@/lib/capped-list";
import { createFlash } from "@/lib/flash";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

type RoleTab = "all" | "manager" | "teacher" | "parent" | "student";

export default function AdminUsersPage() {
  return (
    <RouteGuard minRole="admin">
      <AdminUsersContent />
    </RouteGuard>
  );
}

/** Staff rosters run longer than other lists, so the first load holds more. */
const USER_PAGE_SIZE = 200;

function AdminUsersContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [error, setError] = createSignal("");
  const [selectedParent, setSelectedParent] = createSignal<User | null>(null);
  const [roleTab, setRoleTab] = createSignal<RoleTab>("all");
  const [creating, setCreating] = createSignal(false);
  const [editTarget, setEditTarget] = createSignal<User | null>(null);

  const [list, { refetch }] = createResource(
    // The source keys on the tab so switching tabs refetches from the server.
    // Manager tab is the merged staff roster; every other tab is that one
    // role. "all" omits the key entirely. Every page of the filtered set is
    // read — no cap hides rows.
    () => roleTab(),
    async (tab) => ({
      items: await loadAllPages(
        (params) =>
          getUsers({
            ...params,
            roles: tab === "all" ? undefined : tab === "manager" ? ["manager", "admin"] : [tab],
          }),
        USER_PAGE_SIZE,
      ),
    }),
  );

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
    <div class="space-y-5">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <Tabs value={roleTab()} onChange={(value) => setRoleTab(value as RoleTab)}>
        <TabsList>
          <TabsTrigger value="all">{t("admin.tabAll")}</TabsTrigger>
          <TabsTrigger value="manager">{t("admin.tabManagers")}</TabsTrigger>
          <TabsTrigger value="teacher">{t("admin.tabTeachers")}</TabsTrigger>
          <TabsTrigger value="parent">{t("admin.tabParents")}</TabsTrigger>
          <TabsTrigger value="student">{t("admin.tabStudents")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <section class="space-y-4 p-0">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={list()}>
            <UserTable
              title={t("admin.title")}
              description={t("admin.subtitle")}
              actions={
                <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreating(true)}>
                  <IconPlus class="mr-1.5 h-4 w-4" />
                  {t("admin.createUser")}
                </Button>
              }
              users={list()?.items as User[]}
              currentUserId={auth.user()!.id}
              onRoleChange={onRoleChange}
              onUserClick={(user) => navigate({ to: "/admin/users/$id", params: { id: user.id } })}
              onParentClick={setSelectedParent}
              onEditClick={setEditTarget}
            />
          </Show>
        </Suspense>
      </section>
      <AdminUserEditPanel
        user={editTarget()}
        open={editTarget() !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSaved={async () => {
          // ProfileForm shows its own "saved" toast.
          setEditTarget(null);
          try { await refetch(); } catch { /* stale rows until the next load */ }
        }}
      />
      <CreateUserPanel
        open={creating()}
        onOpenChange={setCreating}
        onCreated={(user) => {
          setCreating(false);
          setFlash(t("admin.createUserDone", { username: user.username }));
          void refetch();
        }}
      />
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
