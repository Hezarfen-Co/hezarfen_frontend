import { Link, useLocation, useParams } from "@tanstack/solid-router";
import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getUserById, getUserProfile, patchUserRole } from "@/api/users";
import { formatApiError, type Role } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/layout/route-guard";
import { ParentStudentsPanel } from "@/components/users/parent-students-panel";
import { AdminUserEditPanel } from "@/components/users/admin-user-edit-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailField } from "@/components/ui/detail-field";
import { IconEdit, IconExternalLink, IconUsers } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { ROLES, hasMinRole } from "@/lib/roles";
import { genderLabel } from "@/lib/gender";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function AdminUserDetailPage() {
  return (
    <RouteGuard minRole="admin">
      <AdminUserDetailContent />
    </RouteGuard>
  );
}

function AdminUserDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/admin/users/$id" });
  const auth = useAuth();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });
  const [user, { refetch }] = createResource(id, (userId) => getUserById(userId));
  // Branş (and display name/bio) live only on the profile read, not on User.
  const [profile, { refetch: refetchProfile }] = createResource(id, (userId) => getUserProfile(userId).catch(() => null));
  const [editing, setEditing] = createSignal(false);
  const [studentsOpen, setStudentsOpen] = createSignal(false);
  const [pendingRole, setPendingRole] = createSignal<Role>("student");
  const [roleConfirmOpen, setRoleConfirmOpen] = createSignal(false);
  const [error, setError] = createSignal("");

  createEffect(() => {
    const current = user();
    if (current?.id === id()) setPendingRole(current.role);
  });

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={user()?.id === id() ? user() : undefined}
        fallback={
          <Show when={user.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(user.error)}</Alert>
          </Show>
        }
      >
        {(current) => (
          <div class="mx-auto w-full max-w-[1100px] space-y-5">
            <Show when={error()}>
              <Alert variant="destructive">{error()}</Alert>
            </Show>
            <section class="data-shell space-y-2 p-4 sm:p-5">
              <Breadcrumbs
                items={[
                  { label: t("nav.users"), to: "/admin/users" },
                  { label: [current().name, current().surname].filter(Boolean).join(" ") || current().username },
                ]}
              />
              <PageHeader
                title={[current().name, current().surname].filter(Boolean).join(" ") || current().username}
                description={`@${current().username}`}
                actions={
                  <>
                    <Link to="/profile/$userId" params={{ userId: current().id }}>
                      <Button type="button" variant="ghost" size="sm">
                        <IconExternalLink class="h-4 w-4" />
                        {t("profile.viewProfile")}
                      </Button>
                    </Link>
                    <Button type="button" size="sm" onClick={() => setEditing(true)}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Show when={current().role === "parent"}>
                      <Button type="button" variant="outline" size="sm" onClick={() => setStudentsOpen(true)}>
                        <IconUsers class="h-4 w-4" />
                        {t("parentLink.manage")}
                      </Button>
                    </Show>
                  </>
                }
              />
            </section>

            <section class="data-shell grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              <DetailField label={t("admin.username")} value={current().username} />
              <DetailField label={t("profile.email")} value={current().email || "—"} />
              <DetailField label={t("profile.phone")} value={current().phone || "—"} />
              <DetailField label={t("profile.birthDate")} value={current().birth_date || "—"} />
              <DetailField label={t("profile.gender")} value={genderLabel(current().gender, t)} />
              <DetailField label={t("profile.address")} value={current().address || "—"} />
              <DetailField label={t("profile.emergencyContactName")} value={current().emergency_contact_name || "—"} />
              <DetailField label={t("profile.emergencyContactPhone")} value={current().emergency_contact_phone || "—"} />
              <Show when={current().role === "student"}>
                <DetailField label={t("roster.studentNumber")} value={current().student_number || "—"} />
              </Show>
              <Show when={hasMinRole(current().role, "teacher")}>
                <DetailField label={t("profile.branch")} value={profile.latest?.branch || "—"} />
              </Show>
              <DetailField label={t("admin.id")} value={current().id} mono />
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-text-subtle">{t("admin.role")}</p>
                <div class="flex gap-2">
                  <Select
                    class="h-9"
                    value={pendingRole()}
                    disabled={current().id === auth.user()?.id}
                    onChange={(event) => setPendingRole(event.currentTarget.value as Role)}
                  >
                    {ROLES.map((role) => <option value={role}>{t(`role.${role}` as MessageKey)}</option>)}
                  </Select>
                  <Button
                    size="sm"
                    disabled={current().id === auth.user()?.id || pendingRole() === current().role}
                    onClick={() => setRoleConfirmOpen(true)}
                  >
                    {t("common.update")}
                  </Button>
                </div>
              </div>
            </section>

            <AdminUserEditPanel
              user={current()}
              open={editing()}
              onOpenChange={setEditing}
              onSaved={async () => {
                setEditing(false);
                void refetchProfile();
                await refetch();
              }}
            />

            <ParentStudentsPanel
              parent={{
                id: current().id,
                username: current().username,
                // Both halves of the name, or the panel calls "Yusuf Baş" just "Yusuf".
                display_name: [current().name, current().surname].filter(Boolean).join(" ") || current().username,
              }}
              open={studentsOpen()}
              onOpenChange={setStudentsOpen}
            />

            <ConfirmDialog
              open={roleConfirmOpen()}
              onOpenChange={setRoleConfirmOpen}
              title={t("confirm.updateTitle")}
              description={current().role === "admin" && pendingRole() !== "admin" ? t("admin.demoteAdminWarning") : undefined}
              variant={current().role === "admin" && pendingRole() !== "admin" ? "destructive" : "default"}
              confirmLabel={t("confirm.confirmUpdate")}
              summary={t("confirm.updateRole", {
                user: current().username,
                from: t(`role.${current().role}` as MessageKey),
                to: t(`role.${pendingRole()}` as MessageKey),
              })}
              onConfirm={async () => {
                setError("");
                try {
                  await patchUserRole(current().id, pendingRole());
                  await refetch();
                } catch (err) {
                  setError(formatApiError(err));
                }
              }}
            />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
