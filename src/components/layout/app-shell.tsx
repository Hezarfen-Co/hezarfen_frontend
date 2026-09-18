import { Show, createEffect, createMemo, createSignal, type ParentProps } from "solid-js";
import { Link, useCanGoBack, useLocation, useNavigate, useRouter } from "@tanstack/solid-router";
import { LogoMark } from "@/components/brand/logo-mark";
import { AccountProfileDialog } from "@/components/users/account-profile-dialog";
import { CelebiPanel } from "@/components/layout/celebi-panel";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { NavBar } from "@/components/layout/nav-bar";
import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
import { NotificationCenter } from "@/components/layout/notification-center";
import { routeLabelKey } from "@/components/layout/nav-items";
import { ShellMessagesButton } from "@/components/layout/shell-messages-button";
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet";
import { SideNav } from "@/components/layout/side-nav";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { IconChevronLeft, IconSparkles } from "@/components/ui/icons";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/stores/auth-context";
import { useModules } from "@/stores/modules-context";
import { celebiPanelOpen, openCelebiPanel, setCelebiPanelOpen } from "@/stores/celebi-panel";
import { commandPaletteOpen, openCommandPalette, setCommandPaletteOpen } from "@/stores/command-palette";
import { ShellFeedProvider } from "@/stores/shell-feed-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { backTarget } from "@/lib/back-target";
import { cn } from "@/lib/cn";
import { ModuleGate } from "@/components/layout/module-gate";

const SIDEBAR_EXPANDED = "w-[260px]";
const SIDEBAR_COLLAPSED = "w-24";

export function AppShell(props: ParentProps) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const modules = useModules();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [profileOpen, setProfileOpen] = createSignal(false);
  const collapsed = () => prefs.sidebarCollapsed();
  const location = useLocation();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // A deep link or a fresh tab has no in-app entry behind it, and
  // history.back() there would leave the app: go to the parent route instead.
  const goBack = () => {
    if (canGoBack()) return router.history.back();
    void navigate({ to: backTarget(location().pathname, Object.keys(router.routesByPath)) });
  };
  const fullScreen = () => location().pathname.startsWith("/exam-room/");
  const routeLabel = createMemo(() => {
    const key = routeLabelKey(location().pathname, auth.user()?.role);
    return key ? t(key) : "";
  });
  // One place names the browser tab for every shell route, from the same
  // label the header shows.
  createEffect(() => {
    const label = routeLabel();
    document.title = label ? `${label} · ${t("app.name")}` : t("app.name");
  });
  const logout = async () => {
    await auth.logout();
    void navigate({ to: "/login" });
  };

  return (
    <div class="min-h-[var(--app-viewport)] bg-background text-foreground">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-md focus:bg-surface-base focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        {t("common.skipToContent")}
      </a>
      <Show when={!auth.user()}>
        <NavBar />
      </Show>
      <ShellFeedProvider>
      <div class="flex w-full">
        <Show when={auth.user() && !fullScreen()}>
          <aside
            class={cn(
              "sticky top-[env(safe-area-inset-top)] z-40 hidden h-[var(--app-viewport)] shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex lg:flex-col",
              collapsed() ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            )}
          >
            <div
              class={cn(
                "flex h-[45px] shrink-0 items-center border-b border-border/70",
                collapsed() ? "justify-center px-2" : "px-3",
              )}
            >
              <Link
                to="/"
                class={cn("flex min-w-0 items-center gap-2.5", collapsed() ? "justify-center" : "flex-1")}
                title={t("app.name")}
              >
                <span class="flex h-8 w-8 shrink-0 items-center justify-center text-foreground">
                  <LogoMark size={28} />
                </span>
                <Show when={!collapsed()}>
                  <span class="truncate text-base font-semibold tracking-tight text-foreground dark:text-white 2xl:text-lg">{t("app.name")}</span>
                </Show>
              </Link>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2.5">
              <SideNav
                collapsed={collapsed()}
                onOpenCelebi={() => openCelebiPanel()}
                onOpenProfile={() => setProfileOpen(true)}
              />
            </div>

            <SidebarAccount collapsed={collapsed()} onLogout={logout} />

            {/* Collapse toggle rides the corner where the sidebar's right edge
                meets the header's bottom border. */}
            <button
              type="button"
              class="absolute right-0 top-[45px] z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={collapsed() ? t("nav.expand") : t("nav.collapse")}
              aria-expanded={!collapsed()}
              title={collapsed() ? t("nav.expand") : t("nav.collapse")}
              onClick={() => prefs.toggleSidebar()}
            >
              <IconChevronLeft class={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed() && "rotate-180")} />
            </button>

          </aside>
        </Show>

        <Show when={auth.user()}>
          <MobileNavSheet
            open={mobileOpen()}
            onClose={() => setMobileOpen(false)}
            onLogout={logout}
            onOpenCelebi={() => openCelebiPanel()}
            onOpenProfile={() => setProfileOpen(true)}
          />
        </Show>

        <main id="main-content" tabIndex={-1} class="min-w-0 flex-1 outline-hidden">
          <Show when={auth.user() && !fullScreen()}>
            <header class="sticky top-[env(safe-area-inset-top)] z-30 flex h-[45px] items-center gap-3 border-b border-border/70 bg-background px-4 sm:px-6 lg:px-4">
              <div class="flex min-w-0 shrink-0 items-center gap-2 sm:w-52 lg:w-[260px]">
                <Show when={location().pathname !== "/"}>
                  <button
                    type="button"
                    onClick={goBack}
                    class="topbar-control flex h-9 w-9 shrink-0 items-center justify-center rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("common.back")}
                    title={t("common.back")}
                  >
                    <IconChevronLeft class="h-4 w-4" />
                  </button>
                </Show>
                <span class="hidden truncate text-sm font-semibold sm:block" title={routeLabel()}>{routeLabel()}</span>
              </div>

              <div class="min-w-0 flex-1" />

              <div class="flex shrink-0 items-center justify-end gap-2">
                <Show when={modules.isEnabled("messages")}>
                  <ShellMessagesButton />
                </Show>
                <NotificationCenter />
                <Show when={modules.isEnabled("chatbot")}>
                  <button
                    type="button"
                    class="topbar-ai-control hidden h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:flex"
                    aria-label={t("ai.askCelebi")}
                    title={t("ai.askCelebi")}
                    onClick={() => openCelebiPanel()}
                  >
                    <IconSparkles class="h-4 w-4" />
                    <span>{t("ai.askCelebi")}</span>
                  </button>
                </Show>
              </div>
            </header>
          </Show>
          <Show when={auth.user() && !fullScreen()}>
            <NetworkStatusBanner />
          </Show>
          <div
            class={cn(
              // Every page fills the content column, as Messages always did: a
              // fixed 1180px cap left wide screens mostly empty margin.
              "w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-6",
              auth.user() && !fullScreen() && "pb-[calc(3.5rem+max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))] lg:pb-6",
            )}
          >
            <Show when={auth.user()} fallback={props.children}>
              <ModuleGate>{props.children}</ModuleGate>
            </Show>
          </div>
        </main>
      </div>
      {/* MobileTabBar stays inside the provider — it is a shell surface, so a
          useShellFeed() badge there must not throw. */}
      <Show when={auth.user() && !fullScreen()}>
        <MobileTabBar onMenu={() => setMobileOpen(true)} onSearch={openCommandPalette} />
      </Show>
      </ShellFeedProvider>
      <Show when={auth.user()}>
        <CelebiPanel open={celebiPanelOpen()} onOpenChange={setCelebiPanelOpen} />
        <CommandPalette
          open={commandPaletteOpen()}
          onOpenChange={setCommandPaletteOpen}
          onOpenCelebi={() => openCelebiPanel()}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <AccountProfileDialog open={profileOpen()} onOpenChange={setProfileOpen} />
      </Show>
      <Toaster />
    </div>
  );
}
