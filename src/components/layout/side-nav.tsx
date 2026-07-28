import { For, Show } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import { primaryNavItems, routeNavItem, sidebarNavGroups, type NavItem } from "@/components/layout/nav-items";
import { IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

export function SideNav(props: { onNavigate?: () => void; collapsed?: boolean }) {
  const auth = useAuth();
  const t = useT();
  const feed = useShellFeed();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const primary = () => primaryNavItems(auth.user()?.role);
  const groups = () => sidebarNavGroups(auth.user()?.role);
  const current = () => routeNavItem(pathname(), auth.user()?.role);
  const unread = () => feed.unreadMessages().total;
  const badgeFor = (item: NavItem) => (item.id === "messages" ? unread() : 0);

  return (
    <nav class="flex h-full flex-col" aria-label={t("nav.menu")}>
      <div class="grid gap-1">
        <For each={primary()}>
          {(item) => {
            const active = () => current()?.id === item.id;
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
      <For each={groups()}>
        {(group) => {
          // Every group collapses the same way when expanded; the collapsed
          // rail falls through to the icon-only section below.
          const dropdown = () => !props.collapsed;
          const active = () => group.items.some((item) => current()?.id === item.id);
          const links = (
            <div class="grid gap-1">
              <For each={group.items}>
                {(item: NavItem) => {
                  const itemActive = () => current()?.id === item.id;
                  return (
                    <Link
                      to={item.to}
                      onClick={() => props.onNavigate?.()}
                      title={t(item.labelKey)}
                      aria-current={itemActive() ? "page" : undefined}
                      class={cn(
                        "relative flex h-9 items-center rounded-lg text-[13px] font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        props.collapsed ? "mx-auto w-10 justify-center px-0" : "gap-3 px-3",
                        itemActive()
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
          );
          return (
            <Show
              when={dropdown()}
              fallback={
                <section class="mt-4 border-t border-border/60 pt-3 first:mt-3 dark:border-white/8">
                  <h2 class={props.collapsed ? "sr-only" : "mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"}>
                    {t(group.labelKey)}
                  </h2>
                  {links}
                </section>
              }
            >
              <details class="group/nav mt-3 border-t border-border/60 pt-2 dark:border-white/8" open={active()}>
                <summary class="flex h-9 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground outline-hidden transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  <group.Icon class="h-4 w-4 shrink-0" />
                  <span class="truncate">{t(group.labelKey)}</span>
                  <IconChevronDown class="ml-auto h-3.5 w-3.5 transition-transform group-open/nav:rotate-180" />
                </summary>
                <div class="ml-3 mt-1 border-l border-border/70 pl-2">{links}</div>
              </details>
            </Show>
          );
        }}
      </For>
    </nav>
  );
}
