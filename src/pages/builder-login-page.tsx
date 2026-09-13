import { Link, Navigate, useNavigate } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import { postBuilderLogin } from "@/api/builder";
import { ApiError, formatApiError, formatApiErrorMessage } from "@/api/client";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <BuilderProvider>
      <BuilderLoginGate />
    </BuilderProvider>
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
    <div class="flex min-h-[70vh] items-center justify-center">
      <div class="w-full max-w-[420px] rounded-xl border border-border-line bg-surface-base px-6 pb-8 pt-9 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)] sm:px-10">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 flex h-12 w-12 items-center justify-center text-text-strong">
            <LogoMark size={44} />
          </div>
          <h1 class="text-2xl font-semibold tracking-[-0.025em] text-text-strong">{t("builder.loginTitle")}</h1>
          <p class="mt-2 text-sm text-text-subtle">{t("builder.loginSubtitle")}</p>
        </div>
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
            <Input
              id="builder-password"
              class="h-9"
              type="password"
              autocomplete="current-password"
              required
              minlength={MIN_PASSWORD_LEN}
              maxlength={MAX_PASSWORD_LEN}
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          <Show when={error()}>
            <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          </Show>
          <Button type="submit" class="h-9 w-full text-sm" disabled={pending()}>
            {t("auth.login")}
          </Button>
        </form>
        <p class="mt-8 border-t border-border-hairline pt-6 text-center text-sm text-text-subtle">
          <Link to="/login" class="font-semibold text-primary underline-offset-4 hover:underline">
            {t("builder.backToSchoolLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
