import { Link, useNavigate } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getRegisterSchools, postRegister } from "@/api/auth";
import { getLimits } from "@/api/limits";
import { formatApiError } from "@/api/client";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { GuestGuard } from "@/components/layout/guest-guard";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <RegisterForm />
    </GuestGuard>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const t = useT();
  const [school, setSchool] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirm, setShowConfirm] = createSignal(false);
  const [passwordTouched, setPasswordTouched] = createSignal(false);
  const [confirmTouched, setConfirmTouched] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [limits] = createResource(() => getLimits().catch(() => null));
  const [schools] = createResource(() => getRegisterSchools());
  const noSchoolOpen = () => schools.state === "ready" && !schools.error && (schools() ?? []).length === 0;
  const minPasswordLength = () => limits()?.user.min_password_len ?? 6;
  // Inline checks wait until the reader has left the field (or, for the
  // confirmation, typed as many characters as the password) so they never
  // shout at a half-typed value.
  const passwordError = () =>
    passwordTouched() && password().length > 0 && password().length < minPasswordLength()
      ? t("auth.passwordTooShort", { min: minPasswordLength() })
      : undefined;
  const confirmError = () => {
    const cp = confirmPassword();
    if (!cp || cp === password()) return undefined;
    return confirmTouched() || cp.length >= password().length ? t("auth.passwordMismatch") : undefined;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const s = school().trim();
    if (!s) return;
    const u = username().trim();
    const p = password();
    const cp = confirmPassword();
    const userLimits = limits()?.user;
    if (userLimits && (u.length < userLimits.min_username_len || u.length > userLimits.max_username_len)) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (p.length < minPasswordLength()) {
      // Shown inline under the field, not in the form-level banner.
      setError("");
      setPasswordTouched(true);
      return;
    }
    if (userLimits && p.length > userLimits.max_password_len) {
      setError(t("auth.passwordHint"));
      return;
    }
    if (p !== cp) {
      setError("");
      setConfirmTouched(true);
      return;
    }
    setError("");
    setPending(true);
    try {
      await postRegister({ school: s, username: u, password: p });
      void navigate({ to: "/login" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthPageShell title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")}>
        <form class="space-y-5" onSubmit={handleSubmit}>
          <div class="space-y-2">
            <Label for="register-school">{t("auth.school")}</Label>
            <Select
              id="register-school"
              class="h-9"
              required
              disabled={schools.loading || noSchoolOpen() || Boolean(schools.error)}
              value={school()}
              onChange={(e) => setSchool(e.currentTarget.value)}
            >
              <option value="">{t("auth.chooseSchoolTitle")}</option>
              <For each={schools() ?? []}>{(item) => <option value={item.id}>{item.name}</option>}</For>
            </Select>
            <Show when={noSchoolOpen()}>
              <p class="text-sm text-text-subtle">{t("auth.noSchoolOpen")}</p>
            </Show>
            <Show when={schools.error}>
              <p class="text-sm text-destructive-text">{formatApiError(schools.error)}</p>
            </Show>
          </div>

          <div class="space-y-2">
            <Label for="register-username">{t("auth.username")}</Label>
            <Input
              id="register-username"
              class="h-9"
              autocomplete="username"
              minlength={limits()?.user.min_username_len}
              maxlength={limits()?.user.max_username_len}
              required
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
          </div>

          <div class="space-y-2">
            <Label for="register-password">{t("auth.password")}</Label>
            <div class="relative">
              <Input
                id="register-password"
                class="h-9 pr-10"
                type={showPassword() ? "text" : "password"}
                autocomplete="new-password"
                minlength={minPasswordLength()}
                maxlength={limits()?.user.max_password_len}
                required
                aria-invalid={passwordError() ? true : undefined}
                aria-describedby="register-password-hint"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                onBlur={() => setPasswordTouched(true)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword())}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword() ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                <Show when={showPassword()} fallback={<IconEye class="h-4 w-4" />}>
                  <IconEyeOff class="h-4 w-4" />
                </Show>
              </button>
            </div>
            <p
              id="register-password-hint"
              class={passwordError() ? "text-xs font-medium text-destructive-text" : "text-xs text-text-subtle"}
            >
              {passwordError() ?? t("auth.passwordMinHint", { min: minPasswordLength() })}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="register-confirm">{t("auth.confirmPassword")}</Label>
            <div class="relative">
              <Input
                id="register-confirm"
                class="h-9 pr-10"
                type={showConfirm() ? "text" : "password"}
                autocomplete="new-password"
                minlength={minPasswordLength()}
                maxlength={limits()?.user.max_password_len}
                required
                aria-invalid={confirmError() ? true : undefined}
                aria-describedby={confirmError() ? "register-confirm-error" : undefined}
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                onBlur={() => setConfirmTouched(true)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm())}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showConfirm() ? t("auth.hideConfirmPassword") : t("auth.showConfirmPassword")}
              >
                <Show when={showConfirm()} fallback={<IconEye class="h-4 w-4" />}>
                  <IconEyeOff class="h-4 w-4" />
                </Show>
              </button>
            </div>
            <Show when={confirmError()}>
              {(message) => (
                <p id="register-confirm-error" role="alert" class="text-xs font-medium text-destructive-text">{message()}</p>
              )}
            </Show>
          </div>

          {error() && (
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
          )}

          <Button type="submit" class="h-9 w-full text-sm" disabled={pending() || schools.loading || noSchoolOpen() || Boolean(schools.error) || !school()}>
            {pending() ? t("common.loading") : t("auth.register")}
          </Button>
        </form>

        <p class="mt-8 border-t border-border-hairline pt-6 text-center text-sm text-text-subtle">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" class="font-semibold text-primary-text underline-offset-4 hover:underline">
            {t("auth.login")}
          </Link>
        </p>
    </AuthPageShell>
  );
}
