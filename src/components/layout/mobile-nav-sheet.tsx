import { For, Show, createSignal } from "solid-js";
import { Link, useRouterState } from "@tanstack/solid-router";
import { routeNavItem, sidebarNavGroups, type NavItem } from "@/components/layout/nav-items";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { useShellFeed } from "@/stores/shell-feed-context";
import { useT } from "@/stores/preferences-context";

/**
 * The phone-sized navigation menu: a sheet that rises from the bottom of the
 * screen, where a thumb already is, instead of the side drawer this replaces.
 *
 * It stays mounted and is moved off-screen when closed, so opening and closing
 * both animate; a `<Show>` around it would make it appear and disappear in one
 * frame.
 *
 * It closes by tapping the X, tapping outside, or dragging it down past
 * DISMISS_PX — the gesture people expect from a sheet.
 */

/** How far the sheet has to be pulled down before letting go dismisses it. */
const DISMISS_PX = 96;
export function MobileNavSheet(props: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const auth = useAuth();
  const t = useT();
  const feed = useShellFeed();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // The primary destinations are already one tap away in the tab bar, so the
  // sheet lists everything else.
  const groups = () => sidebarNavGroups(auth.user()?.role);
  const current = () => routeNavItem(pathname(), auth.user()?.role);
  const badgeFor = (item: NavItem) => (item.id === "messages" ? feed.unreadMessages().total : 0);

  // Drag-to-dismiss. Only the grab area drives it, so a flick inside the list
  // still scrolls the list. While dragging, the sheet follows the finger with
  // its transition off; on release it either closes or springs back.
  const [dragY, setDragY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  let startY = 0;

  const startDrag = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startY = event.clientY;
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent) => {
    if (!dragging()) return;
    // Downward only: dragging up must not lift the sheet past its own top.
    setDragY(Math.max(0, event.clientY - startY));
  };

  const endDrag = () => {
    if (!dragging()) return;
    const travelled = dragY();
    setDragging(false);
    setDragY(0);
    if (travelled > DISMISS_PX) props.onClose();
  };

  return (
    <div
      class={cn("fixed inset-0 z-[60] lg:hidden", props.open ? "visible" : "invisible")}
      aria-hidden={props.open ? undefined : "true"}
    >
      <button
        type="button"
        aria-label={t("nav.close")}
        onClick={props.onClose}
        class={cn(
          "absolute inset-0 h-full w-full cursor-default bg-black/45 transition-opacity duration-300",
          props.open ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.menu")}
        class={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-3xl border-t border-border bg-background",
          "pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))]",
          "transition-transform duration-300 ease-out",
          props.open ? "translate-y-0" : "translate-y-full",
        )}
        style={dragging() ? { transform: `translateY(${dragY()}px)`, transition: "none" } : undefined}
      >
        {/* The grab area: handle plus title row. touch-none keeps the browser
            from claiming the vertical gesture for scrolling. */}
        <div
          class="shrink-0 touch-none"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
        <div class="flex justify-center pt-2.5">
          <span class="h-1 w-9 rounded-full bg-border" />
        </div>

        <div class="flex items-center justify-between px-4 pb-2 pt-2">
          <h2 class="text-base font-semibold">{t("nav.menu")}</h2>
          <button
            type="button"
            onClick={props.onClose}
            aria-label={t("nav.close")}
            class="topbar-control flex h-8 w-8 items-center justify-center rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconX class="h-4 w-4" />
          </button>
        </div>
        </div>

        <div class="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-1">
          <For each={groups()}>
            {(group) => (
              <div class="mt-1.5 border-t border-border/60 pt-1.5 first:mt-0 first:border-t-0 first:pt-0">
                <p class="px-3 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
                <div class="flex flex-col">
                  <For each={group.items}>
                    {(item) => {
                      const active = () => current()?.id === item.id;
                      return (
                        <Link
                          to={item.to}
                          onClick={props.onClose}
                          aria-current={active() ? "page" : undefined}
                          class={cn(
                            "flex items-center gap-2.5 rounded-md px-3 py-1.5 transition-colors active:bg-muted",
                            active() ? "text-primary" : "text-foreground",
                          )}
                        >
                          <span
                            class={cn(
                              "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                              active() ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <item.Icon class="h-4 w-4" />
                          </span>
                          <span class="min-w-0 flex-1 truncate text-[13px] font-medium">
                            {t(item.labelKey)}
                          </span>
                          <Show when={badgeFor(item) > 0}>
                            <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                              {badgeFor(item) > 99 ? "99+" : badgeFor(item)}
                            </span>
                          </Show>
                        </Link>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>

        <SidebarAccount onLogout={props.onLogout} />
      </div>
    </div>
  );
}
