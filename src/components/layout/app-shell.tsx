import type { ParentProps } from "solid-js";
import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { AccountProfileDialog } from "@/components/users/account-profile-dialog";
import { CelebiPanel } from "@/components/layout/celebi-panel";
import { Show, createMemo, createSignal } from "solid-js";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { NavBar } from "@/components/layout/nav-bar";
import { SideNav } from "@/components/layout/side-nav";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { Button } from "@/components/ui/button";
import { IconPanelLeft, IconSearch, IconSparkles, IconX } from "@/components/ui/icons";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

const SIDEBAR_EXPANDED = "w-52 2xl:w-56";
const SIDEBAR_COLLAPSED = "w-16";

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
    const path = location().pathname;
    if (path === "/") return t("nav.home");
    if (path === "/notes") return `${t("nav.group.grades")} / ${t("nav.notes")}`;
    if (path === "/messages") return `${t("nav.group.community")} / ${t("nav.messages")}`;
    if (path === "/marks") return `${t("nav.group.classes")} / ${t("nav.marks")}`;
    if (path === "/attendance") return `${t("nav.group.classes")} / ${t("nav.attendance")}`;
    if (path === "/pomodoro") return `${t("nav.group.classes")} / ${t("nav.pomodoro")}`;
    if (path === "/courses" || path.startsWith("/courses/")) return `${t("nav.group.classes")} / ${t("nav.courses")}`;
    if (path === "/studies") return `${t("nav.group.classes")} / ${t("nav.studies")}`;
    if (path === "/clubs") return `${t("nav.group.classes")} / ${t("nav.clubs")}`;
    if (path === "/homework" || path.startsWith("/homework/")) return `${t("nav.group.classes")} / ${t("nav.homework")}`;
    if (path === "/events" || path.startsWith("/events/")) return `${t("nav.group.classes")} / ${t("nav.events")}`;
    if (path === "/exams" || path.startsWith("/exams/")) return `${t("nav.group.classes")} / ${t("nav.exams")}`;
    if (path === "/calendar") return `${t("nav.group.classes")} / ${t("nav.calendar")}`;
    if (path === "/students") return `${t("nav.group.students")} / ${t("nav.myStudents")}`;
    if (path === "/questions" || path.startsWith("/questions/")) return `${t("nav.group.community")} / ${t("pool.title")}`;
    if (path.startsWith("/exam-room/")) return t("nav.exams");
    if (path === "/work") return `${t("nav.group.reports")} / ${t("nav.work")}`;
    if (path === "/management/student-marks") return `${t("nav.group.classes")} / ${t("nav.studentMarks")}`;
    if (path === "/management/student-attendance") return `${t("nav.group.reports")} / ${t("nav.studentAttendance")}`;
    if (path === "/management/pomodoros") return `${t("nav.group.reports")} / ${t("nav.studentPomodoro")}`;
    if (path === "/management/staff-work") return `${t("nav.group.reports")} / ${t("nav.staffWork")}`;
    if (path === "/management/settings") return `${t("nav.group.settings")} / ${t("nav.settings")}`;
    if (path === "/management/terms") return `${t("nav.group.settings")} / ${t("nav.terms")}`;
    if (path === "/admin/users") return `${t("nav.admin")} / ${t("nav.users")}`;
    if (path === "/guide") return t("nav.guide");
    return path;
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
      <div class="flex w-full">
        <Show when={auth.user() && !fullScreen()}>
            <aside
            class={cn(
              "sticky top-0 z-30 hidden h-screen shrink-0 border-r border-black/[0.06] bg-sidebar/95 text-sidebar-foreground backdrop-blur-md transition-[width] duration-200 ease-out dark:border-white/[0.08] dark:bg-[#070707] dark:text-white lg:flex lg:flex-col",
              collapsed() ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            )}
          >
            <div
              class={cn(
                "flex shrink-0 items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.08]",
                collapsed() ? "h-auto flex-col justify-center gap-1.5 px-2 py-2" : "h-14 px-3",
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
                class="h-8 w-8 shrink-0 justify-center rounded-md px-0 text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
            <aside class="absolute inset-y-0 left-0 flex w-60 max-w-[85vw] flex-col border-r border-black/[0.08] bg-sidebar/95 text-sidebar-foreground shadow-apple backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#070707] dark:text-white">
              <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/[0.05] px-3 dark:border-white/[0.08]">
                <Link to="/" class="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-apple">H</span>
                  <span class="truncate font-display text-base font-semibold text-foreground dark:text-white">{t("app.name")}</span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 shrink-0 rounded-md px-0 text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
            <header class="sticky top-0 z-30 hig-translucent-bar flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div class="flex flex-1 items-center justify-start min-w-0">
                <div class="rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-card/80 px-3.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                  <span class="block truncate max-w-[120px] sm:max-w-none">{routeLabel()}</span>
                </div>
              </div>

              <div class="flex flex-1 items-center justify-center max-w-md min-w-0">
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  class="flex h-9 w-full items-center justify-between gap-2.5 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-secondary/60 px-3.5 text-xs font-medium text-muted-foreground shadow-2xs transition-all hover:bg-secondary hover:text-foreground hover:border-border/80"
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

              <div class="flex flex-1 items-center justify-end min-w-0">
                <Button type="button" variant="default" size="sm" class="h-9 rounded-full shrink-0" onClick={() => setCelebiOpen(true)}>
                  <IconSparkles class="h-4 w-4" />
                  <span class="hidden sm:inline">{t("ai.askCelebi")}</span>
                </Button>
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
      <Show when={auth.user() && !wide()}>
        <MobileTabBar onMenu={() => setMobileOpen(true)} />
      </Show>
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
