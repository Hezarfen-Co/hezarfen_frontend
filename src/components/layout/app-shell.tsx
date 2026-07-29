import { Show, createMemo, createSignal, type ParentProps } from "solid-js";
import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { AccountProfileDialog } from "@/components/users/account-profile-dialog";
import { CelebiPanel } from "@/components/layout/celebi-panel";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { NavBar } from "@/components/layout/nav-bar";
import { NotificationCenter } from "@/components/layout/notification-center";
import { routeNavItem } from "@/components/layout/nav-items";
import { ShellMessagesButton } from "@/components/layout/shell-messages-button";
import { SideNav } from "@/components/layout/side-nav";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconPanelLeft, IconSearch, IconSparkles, IconX } from "@/components/ui/icons";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/stores/auth-context";
import { ShellFeedProvider } from "@/stores/shell-feed-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

const SIDEBAR_EXPANDED = "w-60";
const SIDEBAR_COLLAPSED = "w-24";

export function AppShell(props: ParentProps) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [celebiOpen, setCelebiOpen] = createSignal(false);
  const [commandOpen, setCommandOpen] = createSignal(false);
  const [profileOpen, setProfileOpen] = createSignal(false);
  const collapsed = () => prefs.sidebarCollapsed();
  const location = useLocation();
  const wide = () => location().pathname.startsWith("/exam-room/") || location().searchStr.includes("answerUser=") || location().pathname === "/messages";
  const fullScreen = () => location().pathname.startsWith("/exam-room/");
  const routeLabel = createMemo(() => {
    const item = routeNavItem(location().pathname, auth.user()?.role);
    return item ? t(item.labelKey) : location().pathname;
  });
  const logout = async () => {
    await auth.logout();
    void navigate({ to: "/login" });
  };

  return (
    <div class="min-h-screen bg-background text-foreground">
      <Show when={!auth.user()}>
        <NavBar />
      </Show>
      <ShellFeedProvider>
      <div class="flex w-full">
        <Show when={auth.user() && !fullScreen()}>
          <aside
            class={cn(
              "sticky top-0 z-30 hidden h-screen shrink-0 border-r border-border bg-sidebar/95 text-sidebar-foreground shadow-sm backdrop-blur-md transition-[width] duration-200 ease-out lg:flex lg:flex-col",
              collapsed() ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            )}
          >
            <div
              class={cn(
                "flex shrink-0 items-center gap-2 border-b border-border/70",
                collapsed() ? "h-auto flex-col justify-center gap-1.5 px-2 py-2" : "h-16 px-3",
              )}
            >
              <Link
                to="/"
                class={cn("flex min-w-0 items-center gap-2.5", collapsed() ? "justify-center" : "flex-1")}
                title={t("app.name")}
              >
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-apple">
                  H
                </span>
                <Show when={!collapsed()}>
                  <span class="truncate font-display text-base font-semibold tracking-tight text-foreground dark:text-white 2xl:text-lg">{t("app.name")}</span>
                </Show>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-8 w-8 shrink-0 justify-center rounded-md px-0 text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
                aria-label={collapsed() ? t("nav.expand") : t("nav.collapse")}
                title={collapsed() ? t("nav.expand") : t("nav.collapse")}
                onClick={() => prefs.toggleSidebar()}
              >
                <IconPanelLeft class={cn("h-4 w-4 shrink-0 transition-transform duration-200", collapsed() && "scale-x-[-1]")} />
              </Button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2.5">
              <SideNav collapsed={collapsed()} />
            </div>

            <SidebarAccount collapsed={collapsed()} onLogout={logout} />
          </aside>
        </Show>

        <Show when={mobileOpen() && auth.user()}>
          <div class="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              class="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
              aria-label={t("nav.close")}
              onClick={() => setMobileOpen(false)}
            />
            <aside class="absolute inset-y-0 left-0 flex w-60 max-w-[85vw] flex-col border-r border-border bg-sidebar/95 text-sidebar-foreground shadow-apple backdrop-blur-xl">
              <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 px-3 dark:border-white/8">
                <Link to="/" class="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-apple">H</span>
                  <span class="truncate font-display text-base font-semibold text-foreground dark:text-white">{t("app.name")}</span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 shrink-0 rounded-md px-0 text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
                  aria-label={t("nav.close")}
                  onClick={() => setMobileOpen(false)}
                >
                  <IconX class="h-4 w-4" />
                </Button>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto px-1.5 py-2.5">
                <SideNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarAccount onLogout={logout} />
            </aside>
          </div>
        </Show>

        <main class="min-w-0 flex-1">
          <Show when={auth.user() && !fullScreen()}>
            <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
              <div class="flex min-w-0 shrink-0 items-center gap-2 sm:w-44">
                <Show when={location().pathname !== "/"}>
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    class="topbar-control flex h-9 w-9 shrink-0 items-center justify-center rounded-xl outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("common.back")}
                    title={t("common.back")}
                  >
                    <IconChevronLeft class="h-4 w-4" />
                  </button>
                </Show>
                <span class="hidden truncate text-sm font-semibold sm:block">{routeLabel()}</span>
              </div>

              <div class="mx-auto flex min-w-0 max-w-xl flex-1 items-center justify-center">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  class="topbar-control flex h-10 w-full items-center justify-between gap-2.5 rounded-xl px-3.5 text-sm"
                  title={t("dashboard.commandCenter")}
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <IconSearch class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span class="truncate">{t("dashboard.commandCenter")}...</span>
                  </div>
                  <kbd class="hidden shrink-0 rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-block">
                    Ctrl/Cmd K
                  </kbd>
                </button>
              </div>

              <div class="flex shrink-0 items-center justify-end gap-2">
                <ShellMessagesButton />
                <NotificationCenter />
                <button
                  type="button"
                  class="topbar-ai-control hidden h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:flex"
                  onClick={() => setCelebiOpen(true)}
                >
                  <IconSparkles class="h-4 w-4" />
                  <span class="hidden sm:inline">{t("ai.askCelebi")}</span>
                </button>
              </div>
            </header>
          </Show>
          <div
            class={cn(
              "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-6",
              auth.user() && !wide() && "pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6",
              wide() ? "max-w-none" : "max-w-[1280px] xl:max-w-[1600px] 2xl:max-w-none",
            )}
          >
            {props.children}
          </div>
        </main>
      </div>
      {/* MobileTabBar stays inside the provider — it is a shell surface, so a
          useShellFeed() badge there must not throw. */}
      <Show when={auth.user() && !wide()}>
        <MobileTabBar onMenu={() => setMobileOpen(true)} />
      </Show>
      </ShellFeedProvider>
      <Show when={auth.user()}>
        <CelebiPanel open={celebiOpen()} onOpenChange={setCelebiOpen} />
        <CommandPalette
          open={commandOpen()}
          onOpenChange={setCommandOpen}
          onOpenCelebi={() => setCelebiOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <AccountProfileDialog open={profileOpen()} onOpenChange={setProfileOpen} />
      </Show>
      <Toaster />
    </div>
  );
}
