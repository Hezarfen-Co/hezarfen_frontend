import { createMemo, createSignal, Show } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role, User } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { IconCheck, IconEye, IconUsers } from "@/components/ui/icons";
import { ROLES } from "@/lib/roles";
import { useT } from "@/stores/preferences-context";

function displayName(user: User): string {
  return [user.name, user.surname].filter(Boolean).join(" ") || "—";
}

function UserRoleActions(props: {
  user: User;
  currentUserId: string;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
  onParentClick?: (user: User) => void;
}) {
  const t = useT();
  const isSelf = () => props.user.id === props.currentUserId;
  const [pendingRole, setPendingRole] = createSignal<Role>(props.user.role);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const dirty = () => pendingRole() !== props.user.role;

  return (
    <>
      <Select
        class="h-9 rounded-md text-xs"
        value={pendingRole()}
        disabled={isSelf()}
        onChange={(e) => setPendingRole(e.currentTarget.value as Role)}
        aria-label={t("admin.role")}
      >
        {ROLES.map((r) => (
          <option value={r}>{t(`role.${r}` as MessageKey)}</option>
        ))}
      </Select>
      <Show when={!isSelf() && dirty()}>
        <Button type="button" size="sm" class="mt-2 h-10 rounded-md px-3" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}>
          <IconCheck />
          {t("common.update")}
        </Button>
      </Show>
      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title={t("confirm.updateTitle")}
        summary={t("confirm.updateRole", {
          user: props.user.username,
          from: t(`role.${props.user.role}` as MessageKey),
          to: t(`role.${pendingRole()}` as MessageKey),
        })}
        onConfirm={async () => {
          await props.onRoleChange(props.user.id, pendingRole());
        }}
      />
    </>
  );
}

export function UserTable(props: {
  users: User[];
  currentUserId: string;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
  onUserClick?: (user: User) => void;
  onParentClick?: (user: User) => void;
}) {
  const t = useT();
  const searchUser = (user: User, query: string) =>
    [user.username, displayName(user), user.email, user.id, t(`role.${user.role}` as MessageKey)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());
  const columns = createMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: "username",
      header: t("admin.username"),
      size: 220,
      minSize: 140,
      meta: { cellClass: "truncate font-medium" },
    },
    {
      id: "name",
      header: t("profile.name"),
      size: 180,
      minSize: 120,
      meta: { cellClass: "truncate" },
      cell: (cell) => displayName(cell.row.original),
    },
    {
      accessorKey: "email",
      header: t("profile.email"),
      size: 240,
      minSize: 180,
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => cell.row.original.email || "—",
    },
    {
      id: "update",
      header: t("admin.role"),
      size: 208,
      minSize: 208,
      enableHiding: false,
      meta: { headerClass: "w-52", cellClass: "w-52" },
      cell: (cell) => (
        <UserRoleActions user={cell.row.original} currentUserId={props.currentUserId} onRoleChange={props.onRoleChange} onParentClick={props.onParentClick} />
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      size: 112,
      minSize: 112,
      enableHiding: false,
      meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap", cellClass: "w-28 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => props.onUserClick?.(cell.row.original),
            },
            ...(cell.row.original.role === "parent"
              ? [
                  {
                    label: t("nav.myStudents"),
                    icon: <IconUsers class="h-4 w-4" />,
                    onSelect: () => props.onParentClick?.(cell.row.original),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ]);

  return (
    <DataTable
      title={t("nav.users")}
      description={String(props.users.length)}
      columns={columns()}
      data={props.users}
      empty={t("admin.noUsers")}
      storageKey="admin-users"
      searchPredicate={searchUser}
      enablePagination
      pageSize={20}
      onRowClick={props.onUserClick}
    />
  );
}
