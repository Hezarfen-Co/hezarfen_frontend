import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { postRegister } from "@/api/postRegister";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <RegisterForm />
    </GuestGuard>
  );
}

function RegisterForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const u = username().trim();
    const p = password();
    const cp = confirmPassword();
    if (u.length < 3 || u.length > 32) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (p.length < 6 || p.length > 128) {
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
      const user = await postRegister({ username: u, password: p });
      auth.setUser(user);
      void navigate({ to: "/" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8">
      <div class="surface-card w-full max-w-sm p-6 shadow-lg sm:p-8">
        <div class="mb-8 text-center">
          <h1 class="font-display text-3xl font-semibold tracking-tight">{t("auth.registerTitle")}</h1>
          <p class="mt-1.5 text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
        </div>

        <form class="space-y-5" onSubmit={handleSubmit}>
          <div class="space-y-2">
            <Label for="register-username">{t("auth.username")}</Label>
            <Input
              id="register-username"
              class="h-11"
              autocomplete="username"
              minlength={3}
              maxlength={32}
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
                class="h-11 pr-10"
                type={showPassword() ? "text" : "password"}
                autocomplete="new-password"
                minlength={6}
                maxlength={128}
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
              class="h-11"
              type={showPassword() ? "text" : "password"}
              autocomplete="new-password"
              minlength={6}
              maxlength={128}
              required
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
            />
          </div>

          {error() && (
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          )}

          <Button type="submit" class="h-11 w-full text-base" disabled={pending()}>
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
