import { For } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import { IconMenu } from "@/components/ui/icons";
import { primaryNavItems, primaryPathActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export function MobileTabBar(props: { onMenu: () => void }) {
  const auth = useAuth();
  const t = useT();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = () => primaryNavItems(auth.user()?.role);

  return (
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))] lg:hidden"
      aria-label={t("nav.menu")}
    >
      <ul
        class="mx-auto grid h-16 max-w-3xl"
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
                  <span class={cn("flex h-8 w-10 items-center justify-center rounded-md", active() && "bg-muted")}>
                    <item.Icon class="h-4.5 w-4.5" />
                  </span>
                  <span class="max-w-full truncate">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          }}
        </For>
        <li class="min-w-0">
          <button
            type="button"
            aria-label={t("nav.menu")}
            class="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-muted-foreground"
            onClick={() => props.onMenu()}
          >
            <span class="flex h-8 w-10 items-center justify-center rounded-md">
              <IconMenu class="h-4.5 w-4.5" />
            </span>
            <span class="truncate">{t("nav.menu")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
