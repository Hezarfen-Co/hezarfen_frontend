import type { ParentProps } from "solid-js";
import { useLocation } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { NavBar } from "@/components/layout/nav-bar";
import { SideNav } from "@/components/layout/side-nav";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

const SIDEBAR_EXPANDED = "w-56";
const SIDEBAR_COLLAPSED = "w-16";

export function AppShell(props: ParentProps) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const collapsed = () => prefs.sidebarCollapsed();
  const location = useLocation();
  const wide = () => location().pathname.startsWith("/exam-room/");

  return (
    <div class="min-h-screen">
      <NavBar />
      <div class="flex w-full">
        <Show when={auth.user()}>
          <aside
            class={cn(
              "sticky top-14 z-30 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col",
              collapsed() ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
            )}
          >
            <div
              class={cn(
                "flex h-12 shrink-0 items-center border-b border-border",
                collapsed() ? "justify-center px-1" : "px-2",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class={cn(
                  "h-9 text-muted-foreground hover:text-foreground",
                  collapsed() ? "w-9 justify-center px-0" : "w-full justify-between px-2",
                )}
                aria-label={collapsed() ? t("nav.expand") : t("nav.collapse")}
                title={collapsed() ? t("nav.expand") : t("nav.collapse")}
                onClick={() => prefs.toggleSidebar()}
              >
                <Show when={!collapsed()}>
                  <span class="text-xs font-medium">{t("nav.collapse")}</span>
                </Show>
                <Show when={collapsed()} fallback={<IconChevronLeft class="h-4 w-4 shrink-0" />}>
                  <IconChevronRight class="h-4 w-4 shrink-0" />
                </Show>
              </Button>
            </div>

            {/* Nav fills remaining height; guide is pinned above footer inside SideNav */}
            <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
              <SideNav collapsed={collapsed()} />
            </div>

            <div
              class={cn(
                "shrink-0 border-t border-border",
                collapsed() ? "hidden" : "flex items-center justify-center px-3 py-3",
              )}
            >
              <p class="text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("app.workspace")}
              </p>
            </div>
          </aside>
        </Show>

        <main class="min-w-0 flex-1">
          <div class={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8", wide() ? "max-w-none" : "max-w-[1200px]") }>
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
}
