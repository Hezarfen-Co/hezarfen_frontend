import { For } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import { IconMenu } from "@/components/ui/icons";
import { primaryNavItems, primaryPathActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useModules } from "@/stores/modules-context";
import { useT } from "@/stores/preferences-context";

export function MobileTabBar(props: { onMenu: () => void }) {
  const auth = useAuth();
  const t = useT();
  const modules = useModules();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = () => primaryNavItems(auth.user()?.role, modules.enabled());

  return (
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))] lg:hidden"
      aria-label={t("nav.menu")}
    >
      <ul
        class="mx-auto grid h-14 max-w-3xl"
        style={{ "grid-template-columns": `repeat(${items().length + 1}, minmax(0, 1fr))` }}
      >
        <For each={items()}>
          {(item) => {
            const active = () => primaryPathActive(pathname(), item);
            return (
              <li class="min-w-0">
                <Link
                  to={item.to}
                  aria-current={active() ? "page" : undefined}
                  class={cn(
                    "flex h-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                    active() ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span class="flex h-7 w-10 items-center justify-center">
                    <item.Icon class="h-[22px] w-[22px]" />
                  </span>
                  <span class="max-w-full truncate">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          }}
        </For>
        <li class="min-w-0">
          <button
            id="mobile-menu-trigger"
            type="button"
            aria-label={t("nav.menu")}
            class="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-muted-foreground"
            onClick={() => props.onMenu()}
          >
            <span class="flex h-7 w-10 items-center justify-center">
              <IconMenu class="h-[22px] w-[22px]" />
            </span>
            <span class="truncate">{t("nav.menu")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
