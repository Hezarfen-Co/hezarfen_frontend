import { Show, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import { postSchoolAdminPassword, postSchoolEnter } from "@/api/schools";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { useT } from "@/stores/preferences-context";

export type AdminAccessMode = "enter" | "password";

/**
 * The two support doors into a school, both naming one of its admins:
 * `enter` swaps the builder cookie for that admin's session, `password`
 * re-keys the admin and revokes every session it held.
 */
export function SchoolAdminAccessPanel(props: {
  slug: string;
  mode: AdminAccessMode | null;
  onClose: () => void;
  onEntered: () => void;
  onPasswordReset: () => void;
}) {
  const t = useT();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const reset = () => {
    setUsername("");
    setPassword("");
    setError("");
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (props.mode === "enter") {
        await postSchoolEnter(props.slug, { username: username().trim() });
        reset();
        props.onEntered();
      } else {
        await postSchoolAdminPassword(props.slug, { username: username().trim(), password: password() });
        reset();
        props.onPasswordReset();
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel
      open={props.mode != null}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          props.onClose();
        }
      }}
      title={props.mode === "enter" ? t("builder.enterSchool") : t("builder.resetAdminPassword")}
      description={props.mode === "enter" ? t("builder.enterSchoolHint") : t("builder.resetAdminPasswordHint")}
    >
      <form class="space-y-4" onSubmit={submit}>
        <Show when={error()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
        <div class="space-y-1.5">
          <Label for="school-access-username">{t("builder.adminUsername")}</Label>
          <Input id="school-access-username" class="rounded-lg" required minlength={3} maxlength={32} autocomplete="off" value={username()} onInput={(e) => setUsername(e.currentTarget.value)} />
        </div>
        <Show when={props.mode === "password"}>
          <div class="space-y-1.5">
            <Label for="school-access-password">{t("builder.newPassword")}</Label>
            <Input id="school-access-password" class="rounded-lg" type="password" required minlength={6} maxlength={128} autocomplete="new-password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} />
          </div>
        </Show>
        <div class="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={props.onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
            {props.mode === "enter" ? t("builder.enterSchool") : t("builder.resetAdminPassword")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
