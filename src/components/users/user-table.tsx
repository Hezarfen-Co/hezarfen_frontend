import { createMemo, createSignal, Show } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role, User } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { IconCheck, IconEye, IconUsers } from "@/components/ui/icons";
import { ROLES } from "@/lib/roles";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

function displayName(user: User): string {
  return [user.name, user.surname].filter(Boolean).join(" ") || "—";
}

function roleTone(role: Role): string {
  if (role === "admin") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (role === "manager") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (role === "teacher") return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
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
        class="h-8 rounded-sm text-xs"
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
        <Button type="button" size="sm" class="mt-2 h-7 rounded-sm px-2" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}>
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
      meta: { cellClass: "truncate font-medium" },
    },
    {
      id: "name",
      header: t("profile.name"),
      meta: { cellClass: "truncate" },
      cell: (cell) => displayName(cell.row.original),
    },
    {
      accessorKey: "email",
      header: t("profile.email"),
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => cell.row.original.email || "—",
    },
    {
      accessorKey: "role",
      header: t("admin.role"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => (
        <Badge variant="outline" class={cn("mono uppercase tracking-[0.08em]", roleTone(cell.row.original.role))}>
          {t(`role.${cell.row.original.role}` as MessageKey)}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: t("admin.id"),
      meta: { cellClass: "mono truncate text-xs text-muted-foreground" },
    },
    {
      id: "update",
      header: t("admin.role"),
      meta: { headerClass: "w-52", cellClass: "w-52" },
      cell: (cell) => (
        <UserRoleActions user={cell.row.original} currentUserId={props.currentUserId} onRoleChange={props.onRoleChange} onParentClick={props.onParentClick} />
      ),
    },
    {
      id: "actions",
      header: () => (
        <span class="flex items-center justify-center" title={t("common.actions")}>
          <IconEye class="h-4 w-4 text-muted-foreground" />
          <span class="sr-only">{t("common.actions")}</span>
        </span>
      ),
      meta: { headerClass: "w-14 text-center", cellClass: "w-14" },
      cell: (cell) => (
        <Show when={cell.row.original.role === "parent"} fallback={<span class="text-center text-muted-foreground/40">—</span>}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              {
                label: t("nav.myStudents"),
                icon: <IconUsers class="h-4 w-4" />,
                onSelect: () => props.onParentClick?.(cell.row.original),
              },
            ]}
          />
        </Show>
      ),
    },
  ]);

  return (
    <DataTable columns={columns()} data={props.users} tableClass="table-fixed min-w-[58rem]" searchPredicate={searchUser} enablePagination pageSize={20} onRowClick={props.onUserClick} />
  );
}
