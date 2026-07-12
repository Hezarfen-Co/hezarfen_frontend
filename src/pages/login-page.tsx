import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { postLogin } from "@/api/postLogin";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const u = username().trim();
    const p = password();
    if (u.length < 3 || u.length > 32) {
      setError(t("auth.usernameHint"));
      return;
    }
    if (p.length < 6 || p.length > 128) {
      setError(t("auth.passwordHint"));
      return;
    }
    setError("");
    setPending(true);
    try {
      const user = await postLogin({ username: u, password: p });
      auth.setUser(user);
      void navigate({ to: "/" });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-2">
      <div class="hero-panel relative hidden overflow-hidden rounded-[2rem] border border-border/60 p-10 lg:block">
        <div class="absolute -right-8 -top-8 h-40 w-40 rounded-sm bg-primary/20 blur-2xl" />
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("app.name")}</p>
        <h1 class="mt-4 font-display text-4xl font-semibold leading-tight">{t("auth.welcomeBack")}</h1>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{t("app.tagline")}</p>
        <ul class="mt-10 space-y-3 text-sm text-muted-foreground">
          <li class="rounded-sm bg-card/70 px-4 py-3">{t("auth.featureModules")}</li>
          <li class="rounded-sm bg-card/70 px-4 py-3">{t("auth.featurePrefs")}</li>
        </ul>
      </div>

      <div class="surface-card mx-auto w-full max-w-md p-6 sm:p-8">
        <div class="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-2xl font-semibold">{t("auth.loginTitle")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
          </div>
          <div class="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <form class="space-y-4" onSubmit={handleSubmit}>
          <div class="space-y-1.5">
            <Label for="login-username">{t("auth.username")}</Label>
            <Input
              id="login-username"
              class="h-11 rounded-sm"
              autocomplete="username"
              minlength={3}
              maxlength={32}
              required
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
            <p class="text-xs text-muted-foreground">{t("auth.usernameHint")}</p>
          </div>
          <div class="space-y-1.5">
            <Label for="login-password">{t("auth.password")}</Label>
            <Input
              id="login-password"
              class="h-11 rounded-sm"
              type="password"
              autocomplete="current-password"
              minlength={6}
              maxlength={128}
              required
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
            <p class="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
          </div>
          {error() && (
            <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          )}
          <Button type="submit" class="h-11 w-full rounded-sm text-base" disabled={pending()}>
            {t("auth.login")}
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link to="/register" class="font-semibold text-primary underline-offset-4 hover:underline">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
