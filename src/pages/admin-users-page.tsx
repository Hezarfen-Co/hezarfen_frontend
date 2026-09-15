import { useNavigate } from "@tanstack/solid-router";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getUsers } from "@/api/users";
import { patchUserRole } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { UserTable } from "@/components/users/user-table";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function AdminUsersContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [error, setError] = createSignal("");
  const [selectedParent, setSelectedParent] = createSignal<User | null>(null);
  const [roleTab, setRoleTab] = createSignal<RoleTab>("all");

  const [list, { refetch }] = createResource(async () => (await getUsers({ limit: 200 })).items);
  const allUsers = () => list() ?? [];
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
          <Show when={list()}>
            <UserTable
              title={t("admin.title")}
              description={t("admin.subtitle")}
              actions={
                <Button size="sm" variant="outline" class="rounded-lg" disabled title={t("comingSoon.title")}>
                  {t("admin.inviteUser")}
                  <ComingSoonBadge class="ml-1.5" />
                </Button>
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
