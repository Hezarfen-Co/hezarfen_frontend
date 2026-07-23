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
        "relative flex h-9 w-full items-center rounded-md outline-none transition-colors duration-150 active:scale-[0.98] 2xl:h-9",
        props.standalone ? "text-sm font-semibold" : "text-[13px] font-medium",
        props.collapsed ? "mx-auto h-9 w-9 justify-center px-0" : props.standalone ? "gap-2.5 px-2.5" : "gap-2 px-2.5",
        active()
          ? props.standalone
            ? "bg-primary/12 font-semibold text-primary dark:bg-white/[0.09] dark:text-white"
            : "font-semibold text-primary dark:text-white"
          : "text-sidebar-foreground/80 hover:bg-secondary hover:text-foreground dark:text-white/86 dark:hover:bg-white/[0.07] dark:hover:text-white",
      )}
    >
      <props.item.Icon class={cn(props.standalone || props.collapsed ? "h-4 w-4" : "h-3.5 w-3.5", "shrink-0 transition-colors", active() ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/55")} />
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
      <div class="flex flex-col gap-0.5">
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
                        <span class="block h-px bg-border dark:bg-white/[0.08]" />
                      </div>
                    }
                  >
                    <div class="flex items-center gap-2 px-2 pb-1 pt-3">
                      <span class="h-px flex-1 bg-border dark:bg-white/[0.08]" />
                       <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground dark:text-white/45 2xl:text-[11px]">
                        {t("nav.admin")}
                      </span>
                      <span class="h-px flex-1 bg-border dark:bg-white/[0.08]" />
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
                            "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold text-sidebar-foreground/80 transition-colors duration-150 hover:bg-secondary hover:text-foreground dark:text-white/86 dark:hover:bg-white/[0.07] dark:hover:text-white",
                            groupActive() ? "bg-primary/12 text-primary dark:bg-white/[0.09] dark:text-white" : open() && "text-foreground dark:text-white",
                          )}
                          title={t(group.labelKey)}
                          aria-expanded={open()}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <group.Icon class="h-4 w-4 text-muted-foreground dark:text-white/55" />
                          <span class="min-w-0 flex-1 truncate text-left">{t(group.labelKey)}</span>
                          <IconChevronRight class={cn("h-3.5 w-3.5 text-muted-foreground dark:text-white/45 transition-transform duration-150", open() && "rotate-90")} />
                        </button>
                        <Show when={open()}>
                          <div class="ml-6 mt-0.5 grid gap-0.5 overflow-hidden border-l border-border pl-2 transition-all duration-150 dark:border-white/[0.12]">
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
                          "relative flex h-9 w-full items-center justify-center rounded-md px-0 text-muted-foreground outline-none transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-secondary data-[expanded]:text-foreground dark:text-white/65 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-white/30 dark:data-[expanded]:bg-white/[0.08] dark:data-[expanded]:text-white",
                          groupActive() && "bg-primary/12 text-primary dark:bg-white/[0.09] dark:text-white",
                        )}
                        title={t(group.labelKey)}
                        aria-label={t(group.labelKey)}
                      >
                        <group.Icon class="h-3.5 w-3.5" />
                        <IconChevronRight class="absolute right-1 h-3 w-3 opacity-55" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent class="w-52 rounded-lg p-1 shadow-soft dark:border-white/[0.1] dark:bg-[#101010] dark:text-white">
                        <p class="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
                          {t(group.labelKey)}
                        </p>
                        <For each={group.items}>
                          {(item) => {
                            const itemActive = () => pathActive(pathname(), item.to, item.exact);
                            return (
                              <DropdownMenuItem
                                class={cn("rounded-md p-0 dark:text-white/80 dark:focus:bg-white/[0.08] dark:focus:text-white", itemActive() && "bg-primary/12 text-primary dark:bg-white/[0.09] dark:text-white")}
                              >
                                <Link
                                  to={item.to}
                                  onClick={() => props.onNavigate?.()}
                                  class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 outline-none"
                                >
                                  <item.Icon class={cn("h-4 w-4 shrink-0", itemActive() ? "text-primary dark:text-white" : "text-muted-foreground dark:text-white/55")} />
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
