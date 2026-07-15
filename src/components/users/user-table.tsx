import { For, createSignal, Show } from "solid-js";
import type { Role, User } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconCheck } from "@/components/ui/icons";
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

function UserRoleRow(props: {
  user: User;
  currentUserId: string;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
}) {
  const t = useT();
  const isSelf = () => props.user.id === props.currentUserId;
  const [pendingRole, setPendingRole] = createSignal<Role>(props.user.role);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const dirty = () => pendingRole() !== props.user.role;

  return (
    <TableRow>
      <TableCell class="font-medium">{props.user.username}</TableCell>
      <TableCell>{displayName(props.user)}</TableCell>
      <TableCell class="text-muted-foreground">{props.user.email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" class={cn("mono uppercase tracking-[0.08em]", roleTone(props.user.role))}>
          {t(`role.${props.user.role}` as MessageKey)}
        </Badge>
      </TableCell>
      <TableCell class="mono text-xs text-muted-foreground">{props.user.id}</TableCell>
      <TableCell class="w-52">
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
          <Button type="button" size="sm" class="mt-2 h-7 rounded-sm px-2" onClick={() => setConfirmOpen(true)}>
            <IconCheck />
            {t("common.update")}
          </Button>
        </Show>
      </TableCell>

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
    </TableRow>
  );
}

export function UserTable(props: {
  users: User[];
  currentUserId: string;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
}) {
  const t = useT();
  return (
    <div class="data-table-wrap">
      <Table class="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.username")}</TableHead>
            <TableHead>{t("profile.name")}</TableHead>
            <TableHead>{t("profile.email")}</TableHead>
            <TableHead>{t("admin.role")}</TableHead>
            <TableHead>{t("admin.id")}</TableHead>
            <TableHead class="w-52">{t("common.update")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={props.users}>
            {(user) => (
              <UserRoleRow
                user={user}
                currentUserId={props.currentUserId}
                onRoleChange={props.onRoleChange}
              />
            )}
          </For>
        </TableBody>
      </Table>
    </div>
  );
}
