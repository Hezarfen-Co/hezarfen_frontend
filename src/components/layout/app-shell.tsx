import type { ParentProps } from "solid-js";
import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { NavBar } from "@/components/layout/nav-bar";
import { SideNav } from "@/components/layout/side-nav";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { Button } from "@/components/ui/button";
import { IconPanelLeft } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

const SIDEBAR_EXPANDED = "w-56";
const SIDEBAR_COLLAPSED = "w-16";

export function AppShell(props: ParentProps) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const collapsed = () => prefs.sidebarCollapsed();
  const location = useLocation();
  const wide = () => location().pathname.startsWith("/exam-room/");
  const logout = async () => {
    await auth.logout();
    void navigate({ to: "/login" });
  };

  return (
    <div class="min-h-screen bg-background text-foreground">
      <Show when={!auth.user()}>
        <NavBar />
      </Show>
      <div class="flex w-full">
        <Show when={auth.user()}>
          <aside
            class={cn(
              "sticky top-0 z-30 hidden h-screen shrink-0 border-r border-border/80 bg-sidebar shadow-[inset_-1px_0_0_hsl(var(--border)/0.45)] lg:flex lg:flex-col",
              collapsed() ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            )}
          >
            <div
              class={cn(
                "flex shrink-0 items-center gap-2 border-b border-border/70",
                collapsed() ? "h-auto flex-col justify-center gap-1.5 px-2 py-2" : "h-16 px-2",
              )}
            >
              <Link
                to="/"
                class={cn("flex min-w-0 items-center gap-2", collapsed() ? "justify-center" : "flex-1")}
                title={t("app.name")}
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm">
                  H
                </span>
                <Show when={!collapsed()}>
                  <span class="truncate font-display text-lg font-semibold tracking-tight">{t("app.name")}</span>
                </Show>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class={cn(
                  "h-9 rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  collapsed() ? "w-9 justify-center px-0" : "w-9 shrink-0 justify-center px-0",
                )}
                aria-label={collapsed() ? t("nav.expand") : t("nav.collapse")}
                title={collapsed() ? t("nav.expand") : t("nav.collapse")}
                onClick={() => prefs.toggleSidebar()}
              >
                <IconPanelLeft class="h-4 w-4 shrink-0" />
              </Button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-1">
              <SideNav collapsed={collapsed()} />
            </div>

            <SidebarAccount collapsed={collapsed()} onLogout={logout} />
          </aside>
        </Show>

        <Show when={mobileOpen() && auth.user()}>
          <div class="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              class="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label={t("nav.close")}
              onClick={() => setMobileOpen(false)}
            />
            <aside class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar shadow-soft">
              <div class="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
                <Link to="/" class="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">H</span>
                  <span class="font-display text-lg font-semibold">{t("app.name")}</span>
                </Link>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                  {t("nav.close")}
                </Button>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto py-4">
                <SideNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarAccount onLogout={logout} />
            </aside>
          </div>
        </Show>

        <main class="min-w-0 flex-1">
          <div
            class={cn(
              "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-5",
              auth.user() && !wide() && "pb-24 lg:pb-5",
              wide() ? "max-w-none" : "max-w-[1200px]",
            )}
          >
            {props.children}
          </div>
        </main>
      </div>
      <Show when={auth.user() && !wide()}>
        <MobileTabBar onMenu={() => setMobileOpen(true)} />
      </Show>
    </div>
  );
}
