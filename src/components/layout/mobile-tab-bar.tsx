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
      class="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-background/85 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/[0.08] lg:hidden"
      aria-label={t("nav.menu")}
    >
      <ul class="mx-auto grid h-16 max-w-[1200px] grid-cols-5">
        <For each={TABS}>
          {(tab) => {
            const active = () => (tab.action === "menu" ? false : pathActive(pathname(), tab.to, tab.exact));
            return (
              <li class="min-w-0 h-full">
                <Show
                  when={tab.action === "menu"}
                  fallback={
                    <Link
                      to={tab.to}
                      aria-current={active() ? "page" : undefined}
                      class={cn(
                        "relative flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.93]",
                        active() ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        class={cn(
                          "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                          active() ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12),0_2px_8px_hsl(var(--primary)/0.12)]" : "text-muted-foreground",
                        )}
                      >
                        <tab.Icon class="h-5 w-5" />
                      </span>
                      <span class="truncate">{t(tab.labelKey)}</span>
                    </Link>
                  }
                >
                  <button
                    type="button"
                    aria-label={t(tab.labelKey)}
                    class="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-all duration-150 active:scale-[0.93] hover:text-foreground"
                    onClick={() => props.onMenu()}
                  >
                    <span class="flex h-8 w-12 items-center justify-center rounded-full text-muted-foreground">
                      <tab.Icon class="h-5 w-5" />
                    </span>
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
