import { Link } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { SideNav } from "@/components/layout/side-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { IconMenu } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export function NavBar() {
  const auth = useAuth();
  const t = useT();
  const [mobileOpen, setMobileOpen] = createSignal(false);

  return (
    <>
      <header class="sticky top-0 z-40 h-14 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div class="flex h-full items-center gap-3 px-4 lg:px-6">
          <Show when={auth.user()}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-9 w-9 shrink-0 px-0 lg:hidden"
              aria-label={t("nav.menu")}
              onClick={() => setMobileOpen(true)}
            >
              <IconMenu class="h-5 w-5" />
            </Button>
          </Show>

          <Link to="/" class="flex min-w-0 items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground">
              H
            </span>
            <span class="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
              {t("app.name")}
            </span>
          </Link>

          <div class="ml-auto flex shrink-0 items-center gap-2">
            <Show when={!auth.user()}>
              <LocaleSwitcher />
              <ThemeToggle />
            </Show>
            <Show when={auth.user()}>
              <UserMenu />
            </Show>
          </div>
        </div>
      </header>

      <Show when={mobileOpen() && auth.user()}>
        <div class="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            class="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            aria-label={t("nav.close")}
            onClick={() => setMobileOpen(false)}
          />
          <aside class="absolute inset-y-0 left-0 flex w-56 flex-col border-r border-border bg-sidebar shadow-soft">
            <div class="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
              <span class="font-display font-semibold">{t("app.name")}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                {t("nav.close")}
              </Button>
            </div>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
              <SideNav onNavigate={() => setMobileOpen(false)} />
            </div>
            <div class="flex shrink-0 items-center justify-center border-t border-border px-3 py-3">
              <p class="text-center text-[11px] text-muted-foreground">{t("app.workspace")}</p>
            </div>
          </aside>
        </div>
      </Show>
    </>
  );
}
