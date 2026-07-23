import { Link, useRouterState } from "@tanstack/solid-router";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "@/components/ui/icons";
import { HOME_ITEM, pathActive, visibleNavGroups, type NavItem } from "@/components/layout/nav-items";

function NavLink(props: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
  standalone?: boolean;
}) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = () => pathActive(pathname(), props.item.to, props.item.exact);

  return (
    <Link
      to={props.item.to}
      onClick={() => props.onNavigate?.()}
      title={t(props.item.labelKey)}
      aria-current={active() ? "page" : undefined}
      class={cn(
        "relative flex h-9 w-full items-center rounded-xl outline-none transition-all duration-200 ease-out active:scale-[0.97] 2xl:h-10",
        props.standalone ? "text-xs font-semibold 2xl:text-[13px]" : "text-[13px] font-medium 2xl:text-sm",
        props.collapsed ? "justify-center px-0 h-10 w-10 mx-auto" : props.standalone ? "gap-2.5 px-3" : "gap-2.5 pl-8 pr-3",
        active()
          ? "bg-primary/12 text-primary font-semibold shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14),0_1px_6px_hsl(var(--primary)/0.08)]"
          : "text-sidebar-foreground/80 hover:bg-secondary hover:text-foreground",
      )}
    >
      <Show when={active() && !props.collapsed}>
        <span class="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]" />
      </Show>
      <props.item.Icon class={cn("h-4 w-4 shrink-0 transition-colors 2xl:h-[18px] 2xl:w-[18px]", active() ? "text-primary" : "text-muted-foreground")} />
      <span class={cn("truncate", props.collapsed ? "sr-only" : "block min-w-0 flex-1 text-left")}>{t(props.item.labelKey)}</span>
    </Link>
  );
}

export function SideNav(props: { onNavigate?: () => void; collapsed?: boolean }) {
  const auth = useAuth();
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = () => auth.user()?.role;

  const visibleGroups = createMemo(() => visibleNavGroups(role()));
  const activeGroupId = createMemo(
    () =>
      visibleGroups().find((group) => group.items.some((item) => pathActive(pathname(), item.to, item.exact)))?.id ??
      "",
  );
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({});

  const isOpen = (groupId: string) => openGroups()[groupId] === true;

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  createEffect(() => {
    const active = activeGroupId();
    if (!active) return;
    setOpenGroups((current) => (current[active] ? current : { ...current, [active]: true }));
  });

  return (
    <nav class="flex h-full flex-col" aria-label={t("nav.menu")}>
      <div class="flex flex-col gap-1 px-2">
        <NavLink item={HOME_ITEM} collapsed={props.collapsed} onNavigate={props.onNavigate} standalone />
        <For each={visibleGroups()}>
          {(group, index) => {
            const open = () => isOpen(group.id);
            const groupActive = () =>
              group.items.some((item) => pathActive(pathname(), item.to, item.exact));
            const showManagementDivider = () => !!group.minRole && !visibleGroups()[index() - 1]?.minRole;
            return (
              <>
                <Show when={showManagementDivider()}>
                  <Show
                    when={!props.collapsed}
                    fallback={
                      <div class="px-2 py-2">
                        <span class="block h-px bg-border" />
                      </div>
                    }
                  >
                    <div class="flex items-center gap-2 px-2 pb-1 pt-3">
                      <span class="h-px flex-1 bg-border" />
                       <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground 2xl:text-[11px]">
                        {t("nav.admin")}
                      </span>
                      <span class="h-px flex-1 bg-border" />
                    </div>
                  </Show>
                </Show>
                <section>
                  <Show
                    when={props.collapsed}
                    fallback={
                      <>
                        <button
                          type="button"
                          class={cn(
                            "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground 2xl:h-9 2xl:text-xs",
                            groupActive() ? "bg-primary/[0.06] text-foreground" : open() && "text-foreground",
                          )}
                          title={t(group.labelKey)}
                          aria-expanded={open()}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <group.Icon class="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
                          <span class="min-w-0 flex-1 truncate text-left">{t(group.labelKey)}</span>
                          <IconChevronRight class={cn("h-3.5 w-3.5 transition-transform duration-150 2xl:h-4 2xl:w-4", open() && "rotate-90")} />
                        </button>
                        <Show when={open()}>
                          <div class="mt-1 grid gap-0.5 overflow-hidden transition-all duration-150">
                            <For each={group.items}>
                              {(item) => <NavLink item={item} onNavigate={props.onNavigate} />}
                            </For>
                          </div>
                        </Show>
                      </>
                    }
                  >
                    <DropdownMenu placement="right-start" gutter={8}>
                      <DropdownMenuTrigger
                        class={cn(
                          "relative flex h-8 w-full items-center justify-center rounded-md px-0 text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-muted data-[expanded]:text-foreground",
                          groupActive() && "bg-primary/10 text-foreground",
                        )}
                        title={t(group.labelKey)}
                        aria-label={t(group.labelKey)}
                      >
                        <group.Icon class="h-3.5 w-3.5" />
                        <IconChevronRight class="absolute right-1 h-3 w-3 opacity-55" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent class="w-56 rounded-lg border-border/80 bg-popover p-1 shadow-soft">
                        <p class="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {t(group.labelKey)}
                        </p>
                        <For each={group.items}>
                          {(item) => {
                            const itemActive = () => pathActive(pathname(), item.to, item.exact);
                            return (
                              <DropdownMenuItem
                                class={cn("rounded-md p-0", itemActive() && "bg-primary/10 text-foreground")}
                              >
                                <Link
                                  to={item.to}
                                  onClick={() => props.onNavigate?.()}
                                  class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 outline-none"
                                >
                                  <item.Icon class={cn("h-4 w-4 shrink-0", itemActive() ? "text-primary" : "text-muted-foreground")} />
                                  <span class="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                                </Link>
                              </DropdownMenuItem>
                            );
                          }}
                        </For>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Show>
                </section>
              </>
            );
          }}
        </For>
      </div>
    </nav>
  );
}
