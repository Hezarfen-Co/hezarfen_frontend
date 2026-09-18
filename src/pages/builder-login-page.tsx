import { Link, Navigate, useNavigate } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import { postBuilderLogin } from "@/api/builder";
import { ApiError, formatApiError, formatApiErrorMessage } from "@/api/client";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { BuilderProvider, useBuilder } from "@/stores/builder-context";
import { useT } from "@/stores/preferences-context";

// Backend BuilderCredentials bounds (hezarfen_backend src/web/builder.rs).
const MIN_USERNAME_LEN = 3;
const MAX_USERNAME_LEN = 32;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 128;

export default function BuilderLoginPage() {
  return (
    <GuestGuard>
      <BuilderProvider>
        <BuilderLoginGate />
      </BuilderProvider>
    </GuestGuard>
  );
}

function BuilderLoginGate() {
  const session = useBuilder();
  return (
    <Show when={!session.loading()} fallback={<PageSpinner />}>
      <Show when={!session.builder()} fallback={<Navigate to="/builder" />}>
        <BuilderLoginForm />
      </Show>
    </Show>
  );
}

function BuilderLoginForm() {
  const auth = useAuth();
  const session = useBuilder();
  const navigate = useNavigate();
  const t = useT();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await postBuilderLogin({ username: username().trim(), password: password() });
      // The builder cookie replaced any school session this browser held.
      await auth.refresh();
      session.refresh();
      void navigate({ to: "/builder" });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? formatApiErrorMessage("invalid credentials")
          : formatApiError(err),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthPageShell title={t("builder.loginTitle")} subtitle={t("builder.loginSubtitle")}>
        <form class="space-y-[18px]" onSubmit={submit}>
          <div class="space-y-2">
            <Label for="builder-username">{t("auth.username")}</Label>
            <Input
              id="builder-username"
              class="h-9"
              autocomplete="username"
              required
              minlength={MIN_USERNAME_LEN}
              maxlength={MAX_USERNAME_LEN}
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
          </div>
          <div class="space-y-2">
            <Label for="builder-password">{t("auth.password")}</Label>
            <div class="relative">
              <Input
                id="builder-password"
                class="h-9 pr-10"
                type={showPassword() ? "text" : "password"}
                autocomplete="current-password"
                required
                minlength={MIN_PASSWORD_LEN}
                maxlength={MAX_PASSWORD_LEN}
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
          <Show when={error()}>
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
          </Show>
          <Button type="submit" class="h-9 w-full text-sm" disabled={pending()}>
            {t("auth.login")}
          </Button>
        </form>
        <p class="mt-8 border-t border-border-hairline pt-6 text-center text-sm text-text-subtle">
          <Link to="/login" class="font-semibold text-primary-text underline-offset-4 hover:underline">
            {t("builder.backToSchoolLogin")}
          </Link>
        </p>
    </AuthPageShell>
  );
}
