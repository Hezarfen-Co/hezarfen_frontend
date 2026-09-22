import { createMemo, createSignal, Show, type JSX } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role, User } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { IconCheck, IconExternalLink, IconEye, IconUsers } from "@/components/ui/icons";
import { ROLES } from "@/lib/roles";
import { matchesSearch } from "@/lib/search-text";
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
  const demotesAdmin = () => props.user.role === "admin" && pendingRole() !== "admin";

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
        <Button type="button" size="sm" class="mt-2" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}>
          <IconCheck />
          {t("common.update")}
        </Button>
      </Show>
      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title={t("confirm.updateTitle")}
        description={demotesAdmin() ? t("admin.demoteAdminWarning") : undefined}
        variant={demotesAdmin() ? "destructive" : "default"}
        confirmLabel={t("confirm.confirmUpdate")}
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
  title?: string;
  description?: string;
  actions?: JSX.Element;
}) {
  const t = useT();
  const navigate = useNavigate();
  const searchUser = (user: User, query: string) =>
    matchesSearch(query, user.username, user.phone, displayName(user), user.email, t(`role.${user.role}` as MessageKey));
  const columns = createMemo<ColumnDef<User>[]>(() => [
    {
      id: "name",
      accessorFn: displayName,
      header: t("profile.name"),
      size: 220,
      minSize: 140,
      meta: { cellClass: "truncate font-medium" },
      cell: (cell) => displayName(cell.row.original),
    },
    {
      id: "phone",
      header: t("profile.phone"),
      size: 180,
      minSize: 130,
      meta: { cellClass: "truncate" },
      cell: (cell) => cell.row.original.phone || "—",
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
      size: 110,
      minSize: 110,
      enableHiding: false,
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => props.onUserClick?.(cell.row.original),
            },
            {
              label: t("profile.viewProfile"),
              icon: <IconExternalLink class="h-4 w-4" />,
              onSelect: () => void navigate({ to: "/profile/$userId", params: { userId: cell.row.original.id } }),
            },
            ...(cell.row.original.role === "parent"
              ? [
                  {
                    label: t("parentLink.manage"),
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
      title={props.title ?? t("nav.users")}
      description={props.description}
      actions={props.actions}
      columns={columns()}
      data={props.users}
      empty={t("admin.noUsers")}
      storageKey="admin-users"
      searchPredicate={searchUser}
      filterHint={t("search.hint.users")}
      surfaceSections
      enablePagination
      // The shared default (10, halved on phones), like every other list.
      urlState
      onRowClick={props.onUserClick}
    />
  );
}
