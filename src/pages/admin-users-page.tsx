import { useNavigate } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getUsers } from "@/api/users";
import { patchUserRole } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { UserTable } from "@/components/users/user-table";
import { CreateUserPanel } from "@/components/users/create-user-panel";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { IconPlus } from "@/components/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TruncationNotice } from "@/components/ui/truncation-notice";
import { loadCappedList } from "@/lib/capped-list";
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
const USER_LIST_CAP = 200;

function AdminUsersContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [error, setError] = createSignal("");
  const [selectedParent, setSelectedParent] = createSignal<User | null>(null);
  const [roleTab, setRoleTab] = createSignal<RoleTab>("all");
  const [creating, setCreating] = createSignal(false);

  const [loadAll, setLoadAll] = createSignal(false);
  const [list, { refetch }] = createResource(
    () => (loadAll() ? "all" : "capped"),
    (scope) => loadCappedList(getUsers, USER_LIST_CAP, scope === "all"),
  );
  const allUsers = () => list()?.items ?? [];
  const visibleUsers = createMemo(() => {
    const tab = roleTab();
    if (tab === "all") return allUsers();
    if (tab === "manager") return allUsers().filter((user) => user.role === "manager" || user.role === "admin");
    return allUsers().filter((user) => user.role === tab);
  });

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
          <TabsTrigger value="invites" disabled title={t("comingSoon.title")}>
            {t("admin.tabInvites")}
            <ComingSoonBadge class="ml-1.5" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <TruncationNotice
            shown={list()?.items.length ?? 0}
            total={list()?.total ?? 0}
            loading={list.loading}
            onLoadAll={() => setLoadAll(true)}
          />
          <Show when={list()}>
            <UserTable
              title={t("admin.title")}
              description={t("admin.subtitle")}
              actions={
                <>
                  <Button size="sm" variant="outline" class="min-w-[7.5rem] rounded-lg" disabled title={t("comingSoon.title")}>
                    {t("admin.inviteUser")}
                    <ComingSoonBadge class="ml-1.5" />
                  </Button>
                  <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreating(true)}>
                    <IconPlus class="mr-1.5 h-4 w-4" />
                    {t("admin.createUser")}
                  </Button>
                </>
              }
              users={visibleUsers() as User[]}
              currentUserId={auth.user()!.id}
              onRoleChange={onRoleChange}
              onUserClick={(user) => navigate({ to: "/admin/users/$id", params: { id: user.id } })}
              onParentClick={setSelectedParent}
            />
          </Show>
        </Suspense>
      </section>
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
