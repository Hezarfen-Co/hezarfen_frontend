import { Link, useNavigate } from "@tanstack/solid-router";
import { createResource, createSignal, Show } from "solid-js";
import { postRegister } from "@/api/auth";
import { getLimits } from "@/api/limits";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [limits] = createResource(() => getLimits().catch(() => null));

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const u = username().trim();
    const p = password();
    const cp = confirmPassword();
    const userLimits = limits()?.user;
    if (userLimits && (u.length < userLimits.min_username_len || u.length > userLimits.max_username_len)) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (userLimits && (p.length < userLimits.min_password_len || p.length > userLimits.max_password_len)) {
      setError(t("auth.passwordHint"));
      return;
    }
    if (p !== cp) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await postRegister({ username: u, password: p });
      void navigate({ to: "/login" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8">
      <div class="data-shell w-full max-w-sm p-6 shadow-lg sm:p-8">
        <div class="mb-8 text-center">
          <h1 class="text-3xl font-semibold tracking-tight">{t("auth.registerTitle")}</h1>
          <p class="mt-1.5 text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
        </div>

        <form class="space-y-5" onSubmit={handleSubmit}>
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
                minlength={limits()?.user.min_password_len}
                maxlength={limits()?.user.max_password_len}
                required
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
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
          </div>

          <div class="space-y-2">
            <Label for="register-confirm">{t("auth.confirmPassword")}</Label>
            <Input
              id="register-confirm"
              class="h-9"
              type={showPassword() ? "text" : "password"}
              autocomplete="new-password"
              minlength={limits()?.user.min_password_len}
              maxlength={limits()?.user.max_password_len}
              required
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
            />
          </div>

          {error() && (
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          )}

          <Button type="submit" class="h-9 w-full text-base" disabled={pending()}>
            {t("auth.register")}
          </Button>
        </form>

        <p class="mt-8 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" class="font-semibold text-primary underline-offset-4 hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
