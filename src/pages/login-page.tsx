import { Link, useNavigate } from "@tanstack/solid-router";
import { createResource, createSignal, Show } from "solid-js";
import { postLogin } from "@/api/auth";
import { getLimits } from "@/api/limits";
import { formatApiError } from "@/api/client";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}

function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  // Backend slug bounds (hezarfen_backend MIN_SLUG_LEN / MAX_SLUG_LEN).
  const MIN_SCHOOL_SLUG_LEN = 2;
  const MAX_SCHOOL_SLUG_LEN = 32;
  const [school, setSchool] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [limits] = createResource(() => getLimits().catch(() => null));

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const s = school().trim();
    const u = username().trim();
    const p = password();
    if (s.length < MIN_SCHOOL_SLUG_LEN || s.length > MAX_SCHOOL_SLUG_LEN) {
      setError(t("auth.schoolHint"));
      return;
    }
    const userLimits = limits()?.user;
    if (userLimits && (u.length < userLimits.min_username_len || u.length > userLimits.max_username_len)) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (userLimits && (p.length < userLimits.min_password_len || p.length > userLimits.max_password_len)) {
      setError(t("auth.passwordHint"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await postLogin({ school: s, username: u, password: p });
      await auth.refresh();
      void navigate({ to: "/" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="-mx-4 -my-6 flex min-h-[var(--app-viewport)] items-center justify-center overflow-hidden px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div class="w-full max-w-[480px] rounded-xl border border-border-line bg-surface-base px-6 pb-8 pt-9 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)] sm:px-10">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 flex h-12 w-12 items-center justify-center text-text-strong">
            <LogoMark size={44} />
          </div>
          <h1 class="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-text-strong">{t("auth.loginTitle")}</h1>
          <p class="mt-2 text-sm leading-[21px] text-text-subtle">{t("auth.loginSubtitle")}</p>
        </div>

        <form class="space-y-[18px]" onSubmit={handleSubmit}>
          <div class="space-y-2">
            <Label for="login-school">{t("auth.school")}</Label>
            <Input
              id="login-school"
              class="h-9"
              minlength={MIN_SCHOOL_SLUG_LEN}
              maxlength={MAX_SCHOOL_SLUG_LEN}
              required
              value={school()}
              onInput={(e) => setSchool(e.currentTarget.value)}
            />
          </div>

          <div class="space-y-2">
            <Label for="login-username">{t("auth.username")}</Label>
            <Input
              id="login-username"
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
            <Label for="login-password">{t("auth.password")}</Label>
            <div class="relative">
              <Input
                id="login-password"
                class="h-9 pr-10"
                type={showPassword() ? "text" : "password"}
                autocomplete="current-password"
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

          {error() && (
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          )}

          <Button type="submit" class="h-9 w-full text-sm" disabled={pending()}>
            {t("auth.login")}
          </Button>
        </form>

        <p class="mt-8 border-t border-border-hairline pt-6 text-center text-sm text-text-subtle">
          {t("auth.noAccount")}{" "}
          <Link to="/register" class="font-semibold text-primary underline-offset-4 hover:underline">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
