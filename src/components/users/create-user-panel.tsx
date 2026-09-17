import { For, Show, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import type { Role, User } from "@/api/client";
import { getLimits } from "@/api/limits";
import { postUser } from "@/api/users";
import type { MessageKey } from "@/i18n/messages";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { ROLES } from "@/lib/roles";
import { useT } from "@/stores/preferences-context";

/**
 * Admin-only: opens a school account directly (POST /users), no invite and no
 * self-registration. A username that already exists as a person elsewhere is
 * attached to this school only when the password matches — the server's 409
 * says so, the form just relays it.
 */
export function CreateUserPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: User) => void;
  /** Fix the new account to one role when opened from a role-specific roster. */
  fixedRole?: Role;
}) {
  const t = useT();
  const [limits] = createResource(() => getLimits());
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [role, setRole] = createSignal<Role>(props.fixedRole ?? "student");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const userLimits = () => limits.latest?.user;

  const reset = () => {
    setUsername("");
    setPassword("");
    setRole(props.fixedRole ?? "student");
    setError("");
  };

  const close = () => {
    reset();
    props.onOpenChange(false);
  };

  const validate = (): string | null => {
    const reserved = userLimits()?.reserved_usernames ?? [];
    const name = username().trim().toLowerCase();
    if (reserved.some((r) => r.toLowerCase() === name)) return t("admin.createUserReserved");
    return null;
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }
    setPending(true);
    try {
      const created = await postUser({ username: username().trim(), password: password(), role: props.fixedRole ?? role() });
      reset();
      props.onCreated(created);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel
      open={props.open}
      onOpenChange={(open) => { if (!open) close(); }}
      title={t("admin.createUser")}
      description={t("admin.createUserHint")}
    >
      <form class="space-y-4" onSubmit={submit}>
        <Show when={error()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
        <div class="space-y-1.5">
          <Label for="create-user-username">{t("admin.username")}</Label>
          <Input
            id="create-user-username"
            class="h-10 rounded-lg"
            required
            minlength={userLimits()?.min_username_len}
            maxlength={userLimits()?.max_username_len}
            autocomplete="off"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="create-user-password">{t("admin.createUserPassword")}</Label>
          <Input
            id="create-user-password"
            class="h-10 rounded-lg"
            type="password"
            required
            minlength={userLimits()?.min_password_len}
            maxlength={userLimits()?.max_password_len}
            autocomplete="new-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
          <p class="text-xs text-muted-foreground">{t("admin.createUserPasswordHint")}</p>
        </div>
        <Show when={!props.fixedRole}>
          <div class="space-y-1.5">
            <Label for="create-user-role">{t("admin.role")}</Label>
            <Select id="create-user-role" class="h-10" value={role()} onChange={(e) => setRole(e.currentTarget.value as Role)}>
              <For each={ROLES}>{(r) => <option value={r}>{t(`role.${r}` as MessageKey)}</option>}</For>
            </Select>
          </div>
        </Show>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
            {t("admin.createUser")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
