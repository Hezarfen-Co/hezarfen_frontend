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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconCheck } from "@/components/ui/icons";
import { ROLES } from "@/lib/roles";
import { useT } from "@/stores/preferences-context";

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
    <TableRow class="h-16">
      <TableCell class="font-medium">{props.user.username}</TableCell>
      <TableCell class="font-mono text-xs text-muted-foreground">{props.user.id}</TableCell>
      <TableCell class="space-y-2">
        <Select
          class="h-10 rounded-md"
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
          <Button type="button" size="sm" class="rounded-md" onClick={() => setConfirmOpen(true)}>
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
    <div class="overflow-hidden rounded-lg bg-background/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.username")}</TableHead>
            <TableHead>{t("admin.id")}</TableHead>
            <TableHead class="w-56">{t("admin.role")}</TableHead>
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
