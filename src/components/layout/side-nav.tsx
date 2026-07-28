import { For, Show } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import { primaryNavItems, primaryPathActive, type NavItem } from "@/components/layout/nav-items";
import { IconMessage } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

const MESSAGES_ITEM: NavItem = { id: "messages", to: "/messages", labelKey: "nav.messages", Icon: IconMessage };

export function SideNav(props: { onNavigate?: () => void; collapsed?: boolean }) {
  const auth = useAuth();
  const t = useT();
  const feed = useShellFeed();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Curated set: the role's primary items (same source as the mobile tab bar) plus
  // Messages. Everything else stays reachable via the ⌘K command palette.
  const items = (): NavItem[] => {
    const primary = primaryNavItems(auth.user()?.role);
    return primary.some((i) => i.id === "messages") ? primary : [...primary, MESSAGES_ITEM];
  };
  const unread = () => feed.unreadMessages().total;
  const badgeFor = (item: NavItem) => (item.id === "messages" ? unread() : 0);

  return (
    <nav class="flex h-full flex-col" aria-label={t("nav.menu")}>
      <div class="grid gap-1">
        <For each={items()}>
          {(item) => {
            const active = () => primaryPathActive(pathname(), item);
            return (
              <Link
                to={item.to}
                onClick={() => props.onNavigate?.()}
                title={t(item.labelKey)}
                aria-current={active() ? "page" : undefined}
                class={cn(
                  "relative flex h-9 items-center rounded-lg text-[13px] font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  props.collapsed ? "mx-auto w-10 justify-center px-0" : "gap-3 px-3",
                  active()
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <item.Icon class="h-4 w-4 shrink-0" />
                <span class={props.collapsed ? "sr-only" : "truncate"}>{t(item.labelKey)}</span>
                <Show when={badgeFor(item) > 0}>
                  <Show
                    when={!props.collapsed}
                    fallback={
                      <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {unread() > 9 ? "9+" : unread()}
                      </span>
                    }
                  >
                    <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      {unread() > 9 ? "9+" : unread()}
                    </span>
                  </Show>
                </Show>
              </Link>
            );
          }}
        </For>
      </div>
    </nav>
  );
}
