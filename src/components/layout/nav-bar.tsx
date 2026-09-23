import { Link } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { SideNav } from "@/components/layout/side-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeModeControl } from "@/components/layout/theme-mode-control";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { IconMenu, IconX } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { useSchool } from "@/stores/school-context";
import { useT } from "@/stores/preferences-context";

export function NavBar() {
  const auth = useAuth();
  const school = useSchool();
  const t = useT();
  const [mobileOpen, setMobileOpen] = createSignal(false);

  return (
    <>
      <header class="sticky top-[env(safe-area-inset-top)] z-40 h-14 border-b border-border/70 bg-background">
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
            <span class="flex h-8 w-8 shrink-0 items-center justify-center text-foreground">
              <LogoMark size={28} />
            </span>
            <span class="flex min-w-0 flex-col leading-tight">
              <span class="truncate text-base font-semibold tracking-tight sm:text-lg">{t("app.name")}</span>
              <Show when={auth.user() && school.name()}>
                <span class="truncate text-xs font-medium text-muted-foreground">{school.name()}</span>
              </Show>
            </span>
          </Link>

          <div class="ml-auto flex shrink-0 items-center gap-2">
            <Show when={!auth.user()}>
              <LocaleSwitcher />
              <ThemeModeControl variant="toggle" />
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
            class="absolute inset-0 bg-black/80"
            aria-label={t("nav.close")}
            onClick={() => setMobileOpen(false)}
          />
          <aside class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))] pt-[env(safe-area-inset-top)] shadow-sm">
            <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
              <span class="flex min-w-0 items-center gap-2">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center text-foreground">
                  <LogoMark size={28} />
                </span>
                <span class="truncate text-base font-semibold">{t("app.name")}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-8 w-8 shrink-0 px-0"
                aria-label={t("nav.close")}
                onClick={() => setMobileOpen(false)}
              >
                <IconX class="h-4 w-4" />
              </Button>
            </div>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto py-3">
              <SideNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      </Show>
    </>
  );
}
