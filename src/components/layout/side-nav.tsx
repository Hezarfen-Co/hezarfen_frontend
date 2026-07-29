import { For, Show } from "solid-js";
import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import { primaryNavItems, routeNavItem, sidebarNavGroups, type NavItem } from "@/components/layout/nav-items";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

export function SideNav(props: { onNavigate?: () => void; collapsed?: boolean }) {
  const auth = useAuth();
  const t = useT();
  const feed = useShellFeed();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const primary = () => primaryNavItems(auth.user()?.role);
  const groups = () => sidebarNavGroups(auth.user()?.role);
  const current = () => routeNavItem(pathname(), auth.user()?.role);
  const unread = () => feed.unreadMessages().total;
  const badgeFor = (item: NavItem) => (item.id === "messages" ? unread() : 0);

  return (
    <nav class="flex h-full flex-col gap-1" aria-label={t("nav.menu")}>
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
                  props.collapsed ? "mx-auto h-10 w-12 justify-center px-0" : "gap-3 px-3",
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
          const active = () => group.items.some((item) => current()?.id === item.id);
          const renderLinks = (showIcon: boolean) => (
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
                        props.collapsed ? "mx-auto h-10 w-12 justify-center px-0" : "gap-3 px-3",
                        itemActive()
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Show when={showIcon}>
                        <item.Icon class="h-4 w-4 shrink-0" />
                      </Show>
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
              when={props.collapsed}
              fallback={
                <details class="group/nav" open={active()}>
                  <summary
                    class={cn(
                      "flex h-9 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-[13px] font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
                      active()
                        ? "bg-muted/70 text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <group.Icon class="h-4 w-4 shrink-0" />
                    <span class="truncate">{t(group.labelKey)}</span>
                    <IconChevronRight class="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 group-open/nav:rotate-90" />
                  </summary>
                  <div class="mt-1 ml-[1.15rem] border-l border-border/70 pl-2">{renderLinks(false)}</div>
                </details>
              }
            >
              <DropdownMenu placement="right-start" gutter={8}>
                <DropdownMenuTrigger
                  class={cn(
                    "relative mx-auto flex h-10 w-12 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active()
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                  aria-label={t(group.labelKey)}
                  title={t(group.labelKey)}
                >
                  <group.Icon class="h-4 w-4 shrink-0" />
                  <IconChevronRight class={cn("absolute right-1 h-3 w-3", active() ? "opacity-100" : "opacity-60")} />
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-52 p-1">
                  <div class="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                    {t(group.labelKey)}
                  </div>
                  <DropdownMenuSeparator class="my-1" />
                  <For each={group.items}>
                    {(item: NavItem) => (
                      <DropdownMenuItem
                        class="min-h-8 gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px]"
                        onSelect={() => {
                          props.onNavigate?.();
                          void navigate({ to: item.to });
                        }}
                      >
                        <item.Icon class="h-4 w-4 shrink-0" />
                        <span>{t(item.labelKey)}</span>
                        <Show when={badgeFor(item) > 0}>
                          <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                            {unread() > 9 ? "9+" : unread()}
                          </span>
                        </Show>
                      </DropdownMenuItem>
                    )}
                  </For>
                </DropdownMenuContent>
              </DropdownMenu>
            </Show>
          );
        }}
      </For>
    </nav>
  );
}
