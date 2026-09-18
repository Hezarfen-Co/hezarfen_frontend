import { For, Show, createEffect, createSignal, on } from "solid-js";
import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import { HOME_ITEM, routeNavItem, visibleNavGroups, type NavGroup, type NavItem } from "@/components/layout/nav-items";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useModules } from "@/stores/modules-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

const FOLDED_KEY = "hezarfen.navFolded";

function readFolded(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function SideNav(props: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onOpenCelebi?: () => void;
  onOpenProfile?: () => void;
}) {
  const auth = useAuth();
  const t = useT();
  const feed = useShellFeed();
  const modules = useModules();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const home = () => (auth.user() ? [HOME_ITEM] : []);
  const groups = () => visibleNavGroups(auth.user()?.role, modules.enabled());
  const current = () => routeNavItem(pathname(), auth.user()?.role);
  const unread = () => feed.unreadMessages().total;
  const badgeFor = (item: NavItem) => (item.id === "messages" ? unread() : 0);

  const [folded, setFolded] = createSignal<Record<string, boolean>>(readFolded());
  const isFolded = (group: NavGroup) => folded()[group.id] ?? group.defaultFolded ?? false;
  const toggleGroup = (group: NavGroup, section?: HTMLElement) => {
    const opening = isFolded(group);
    // Opening a section near the bottom would leave its rows below the fold;
    // bring the section's last row into view once it has rendered.
    if (opening && section) {
      requestAnimationFrame(() => section.scrollIntoView({ block: "end", behavior: "smooth" }));
    }
    const next = { ...folded(), [group.id]: !isFolded(group) };
    setFolded(next);
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify(next));
    } catch {
      // Private mode / quota: folding still works for this session.
    }
  };

  // Landing on a page inside a folded section unfolds it once, so the active
  // row is visible; the viewer can still fold it again afterwards.
  createEffect(
    on(current, (item) => {
      if (!item) return;
      const group = groups().find((candidate) => candidate.items.some((entry) => entry.id === item.id));
      if (group && isFolded(group)) setFolded({ ...folded(), [group.id]: false });
    }),
  );

  const runAction = (item: NavItem) => {
    props.onNavigate?.();
    if (item.action === "celebi") props.onOpenCelebi?.();
    if (item.action === "profile") props.onOpenProfile?.();
  };

  return (
    <nav class="flex h-full flex-col gap-1" aria-label={t("nav.menu")}>
      <div class="grid gap-1">
        <For each={home()}>
          {(item) => {
            const active = () => current()?.id === item.id;
            return (
              <Link
                to={item.to}
                onClick={() => props.onNavigate?.()}
                title={t(item.labelKey)}
                aria-current={active() ? "page" : undefined}
                class={cn(
                  "relative flex h-[34px] items-center rounded-lg text-[13px] font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  props.collapsed ? "mx-auto h-10 w-12 justify-center px-0" : "gap-3 px-3",
                  active()
                    ? "bg-primary/10 text-primary-text"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <item.Icon class="h-4 w-4 shrink-0" />
                <span class={props.collapsed ? "sr-only" : "truncate"}>{t(item.labelKey)}</span>
              </Link>
            );
          }}
        </For>
      </div>
      <For each={groups()}>
        {(group) => {
          const active = () => group.items.some((item) => current()?.id === item.id);
          const open = () => !isFolded(group);
          let sectionEl: HTMLElement | undefined;
          const renderLinks = () => (
            <div class="grid gap-px">
              <For each={group.items}>
                {(item: NavItem) => {
                  const itemActive = () => current()?.id === item.id;
                  // A function, not a value: Solid runs this callback once, so a plain
                  // cn(...) would freeze the active style at first render.
                  const linkClass = () => cn(
                    "relative flex h-[30px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    itemActive()
                      ? "bg-primary/10 text-primary-text"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  );
                  const content = (
                    <>
                      <item.Icon class="h-4 w-4 shrink-0" />
                      <span class="truncate">{t(item.labelKey)}</span>
                      <Show when={item.soon}>
                        <span class="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("nav.soon")}
                        </span>
                      </Show>
                      <Show when={badgeFor(item) > 0}>
                        <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                          {unread() > 9 ? "9+" : unread()}
                        </span>
                      </Show>
                    </>
                  );
                  return (
                    <Show
                      when={!item.action}
                      fallback={
                        <button type="button" onClick={() => runAction(item)} title={t(item.labelKey)} class={cn(linkClass(), "w-full text-left")}>
                          {content}
                        </button>
                      }
                    >
                      <Link to={item.to} onClick={() => props.onNavigate?.()} title={t(item.labelKey)} aria-current={itemActive() ? "page" : undefined} class={linkClass()}>
                        {content}
                      </Link>
                    </Show>
                  );
                }}
              </For>
            </div>
          );
          return (
            <Show
              when={props.collapsed}
              fallback={
                <section class="mt-2 scroll-mb-2 first:mt-0" ref={sectionEl}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group, sectionEl)}
                    aria-expanded={open()}
                    class="group/section flex h-7 w-full items-center gap-1.5 rounded-md px-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground/80 outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span class="truncate">{t(group.labelKey)}</span>
                    <IconChevronRight
                      class={cn(
                        "ml-auto h-3 w-3 shrink-0 transition-[transform,opacity] duration-200",
                        open() ? "rotate-90 opacity-0 group-hover/section:opacity-60 group-focus-visible/section:opacity-60" : "opacity-60",
                      )}
                    />
                  </button>
                  <Show when={open()}>{renderLinks()}</Show>
                </section>
              }
            >
              <DropdownMenu placement="right-start" gutter={8}>
                <DropdownMenuTrigger
                  class={cn(
                    "relative mx-auto flex h-10 w-12 items-center justify-center rounded-md outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active()
                      ? "bg-primary/10 text-primary-text"
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
                        class="min-h-8 gap-2.5 rounded-md px-2.5 py-1.5 text-[13px]"
                        onSelect={() => {
                          if (item.action) {
                            runAction(item);
                            return;
                          }
                          props.onNavigate?.();
                          void navigate({ to: item.to });
                        }}
                      >
                        <item.Icon class="h-4 w-4 shrink-0" />
                        <span>{t(item.labelKey)}</span>
                        <Show when={item.soon}>
                          <span class="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("nav.soon")}
                          </span>
                        </Show>
                        <Show when={badgeFor(item) > 0}>
                          <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
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
