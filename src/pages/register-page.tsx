import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { postRegister } from "@/api/postRegister";
import { formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestGuard } from "@/components/layout/guest-guard";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
    <div class="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-2">
      <div class="hero-panel relative order-2 hidden overflow-hidden rounded-[2rem] border border-border/60 p-10 lg:order-1 lg:block">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("app.name")}</p>
        <h1 class="mt-4 font-display text-4xl font-semibold leading-tight">{t("auth.createStudent")}</h1>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("auth.registerSubtitle")}
        </p>
      </div>

      <div class="surface-card order-1 mx-auto w-full max-w-md p-6 sm:p-8 lg:order-2">
        <div class="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-2xl font-semibold">{t("auth.registerTitle")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
          </div>
          <div class="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <form class="space-y-4" onSubmit={handleSubmit}>
          <div class="space-y-1.5">
            <Label for="register-username">{t("auth.username")}</Label>
            <Input
              id="register-username"
              class="h-11 rounded-sm"
              autocomplete="username"
              minlength={3}
              maxlength={32}
              required
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
          </div>
          <div class="space-y-1.5">
            <Label for="register-password">{t("auth.password")}</Label>
            <Input
              id="register-password"
              class="h-11 rounded-sm"
              type="password"
              autocomplete="new-password"
              minlength={6}
              maxlength={128}
              required
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          {error() && (
            <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
          )}
          <Button type="submit" class="h-11 w-full rounded-sm text-base" disabled={pending()}>
            {t("auth.register")}
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" class="font-semibold text-primary underline-offset-4 hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
