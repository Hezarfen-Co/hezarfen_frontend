import { For, Show } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import {
  IconBook,
  IconExam,
  IconHome,
  IconMenu,
  IconNote,
} from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";
import type { Component } from "solid-js";

type TabItem = {
  to: string;
  labelKey: MessageKey;
  Icon: Component<{ class?: string }>;
  exact?: boolean;
  action?: "menu";
};

const TABS: TabItem[] = [
  { to: "/", labelKey: "nav.home", Icon: IconHome, exact: true },
  { to: "/courses", labelKey: "nav.courses", Icon: IconBook },
  { to: "/exams", labelKey: "nav.exams", Icon: IconExam },
  { to: "/notes", labelKey: "nav.notes", Icon: IconNote },
  { to: "#menu", labelKey: "nav.menu", Icon: IconMenu, action: "menu" },
];

function pathActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function MobileTabBar(props: { onMenu: () => void }) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_hsl(var(--border)/0.5)] backdrop-blur lg:hidden"
      aria-label={t("nav.menu")}
    >
      <ul class="mx-auto grid h-14 max-w-[1200px] grid-cols-5">
        <For each={TABS}>
          {(tab) => {
            const active = () => tab.action === "menu" ? false : pathActive(pathname(), tab.to, tab.exact);
            return (
              <li class="min-w-0">
                <Show
                  when={tab.action === "menu"}
                  fallback={
                    <Link
                      to={tab.to}
                      aria-current={active() ? "page" : undefined}
                      class={cn(
                        "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                        active() ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <tab.Icon class={cn("h-5 w-5", active() ? "text-primary" : "text-muted-foreground")} />
                      <span class="truncate">{t(tab.labelKey)}</span>
                    </Link>
                  }
                >
                  <button
                    type="button"
                    class="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground transition-colors"
                    onClick={() => props.onMenu()}
                  >
                    <tab.Icon class="h-5 w-5" />
                    <span class="truncate">{t(tab.labelKey)}</span>
                  </button>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </nav>
  );
}
