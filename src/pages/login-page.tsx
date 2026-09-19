import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { postLogin, postLogout, postSelectSchool } from "@/api/auth";
import { demoCredentials } from "@/lib/demo-login";
import type { SchoolChoiceResponse } from "@/api/auth";
import { getLimits } from "@/api/limits";
import { ApiError, formatApiError, formatApiErrorMessage } from "@/api/client";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { IconEye, IconEyeOff, IconSchool } from "@/components/ui/icons";
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
  const demo = demoCredentials();
  const [username, setUsername] = createSignal(demo?.username ?? "");
  const [password, setPassword] = createSignal(demo?.password ?? "");
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [schoolChoice, setSchoolChoice] = createSignal<SchoolChoiceResponse | null>(null);
  const [selectingSchool, setSelectingSchool] = createSignal<string | null>(null);
  const [limits] = createResource(() => getLimits().catch(() => null));

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const u = username().trim();
    const p = password();
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
      const result = await postLogin({ username: u, password: p });
      if ("schools" in result) {
        setSchoolChoice(result);
        return;
      }
      await auth.refresh();
      void navigate({ to: "/" });
    } catch (err) {
      // On this page a 401 means the credentials were wrong, not that a
      // session lapsed — the generic "sign in to continue" reads as nonsense
      // to someone who is already looking at the sign-in form.
      setError(
        err instanceof ApiError && err.status === 401
          ? formatApiErrorMessage("invalid credentials")
          : formatApiError(err),
      );
    } finally {
      setPending(false);
    }
  };

  const handleSchoolSelect = async (school: string) => {
    if (pending()) return;
    setError("");
    setPending(true);
    setSelectingSchool(school);
    try {
      await postSelectSchool({ school });
      await auth.refresh();
      void navigate({ to: "/" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
      setSelectingSchool(null);
    }
  };

  const handleDifferentAccount = async () => {
    if (pending()) return;
    setPending(true);
    try {
      await postLogout();
    } finally {
      setSchoolChoice(null);
      setPassword("");
      setError("");
      setPending(false);
    }
  };

  return (
    <AuthPageShell
      title={schoolChoice() ? t("auth.chooseSchoolTitle") : t("auth.loginTitle")}
      subtitle={schoolChoice()
        ? t("auth.chooseSchoolSubtitle", { username: schoolChoice()!.username })
        : t("auth.loginSubtitle")}
    >

        <Show when={!schoolChoice()}>
          <>
            <form class="space-y-[18px]" onSubmit={handleSubmit}>
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
                <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
              )}

              <Button type="submit" class="h-9 w-full text-sm" disabled={pending()}>
                {pending() ? t("common.loading") : t("auth.login")}
              </Button>
              <Show when={demo}>
                {(account) => (
                  <Button
                    type="submit"
                    variant="outline"
                    class="h-9 w-full text-sm"
                    disabled={pending()}
                    onClick={() => {
                      setUsername(account().username);
                      setPassword(account().password);
                    }}
                  >
                    {t("auth.demoLogin", { username: account().username })}
                  </Button>
                )}
              </Show>
            </form>

            <p class="mt-8 border-t border-border-hairline pt-6 text-center text-sm text-text-subtle">
              {t("auth.noAccount")}{" "}
              <Link to="/register" class="font-semibold text-primary-text underline-offset-4 hover:underline">
                {t("auth.register")}
              </Link>
            </p>
            <p class="mt-3 text-center text-xs text-text-subtle">
              <Link to="/builder/login" class="underline-offset-4 hover:text-foreground hover:underline">
                {t("builder.operatorLogin")}
              </Link>
            </p>
          </>
        </Show>

        <Show when={schoolChoice()}>
          {(choice) => (
            <div class="space-y-3">
              <For each={choice().schools}>
                {(school) => (
                  <Button
                    type="button"
                    variant="outline"
                    class="h-auto w-full justify-start px-4 py-3 text-left"
                    disabled={pending()}
                    onClick={() => void handleSchoolSelect(school.slug)}
                  >
                    <IconSchool class="h-5 w-5 shrink-0 text-primary-text" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold text-text-strong">{school.name}</span>
                      <span class="block truncate text-xs font-normal text-text-subtle">{school.slug}</span>
                    </span>
                    <Show when={selectingSchool() === school.slug}>
                      <span class="text-xs font-normal text-text-subtle">{t("common.loading")}</span>
                    </Show>
                  </Button>
                )}
              </For>

              {error() && (
                <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
              )}

              <Button
                type="button"
                variant="ghost"
                class="w-full"
                disabled={pending()}
                onClick={() => void handleDifferentAccount()}
              >
                {t("auth.differentAccount")}
              </Button>
            </div>
          )}
        </Show>
    </AuthPageShell>
  );
}
