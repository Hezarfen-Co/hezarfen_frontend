import { For, Show } from "solid-js";
import { accountDisplayName, type AccountMenu } from "@/components/layout/account-menu";
import { ThemeModeControl } from "@/components/layout/theme-mode-control";
import { IconChevronRight } from "@/components/ui/icons";
import { UserAvatar } from "@/components/users/user-avatar";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/**
 * The account view inside the phone menu sheet. The sheet drills into it the
 * way a phone's settings do — same sheet, a back arrow in its header — rather
 * than stacking a dropdown on top of the sheet.
 */
export function MobileAccountPanel(props: { menu: AccountMenu }) {
  const t = useT();
  const rowClass = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium outline-hidden transition-colors active:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Show when={props.menu.user()}>
      {(u) => (
        <div class="space-y-2 px-2 pb-2">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl bg-muted/70 p-3 text-left outline-hidden transition-colors active:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            onClick={props.menu.openProfile}
          >
            <UserAvatar userId={u().id} name={accountDisplayName(u())} hasAvatar={props.menu.hasAvatar()} size="md" class="ring-0" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{accountDisplayName(u())}</span>
              <span class="block truncate text-xs text-muted-foreground">@{u().username}</span>
            </span>
            <IconChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <div class="flex flex-col">
            <For each={props.menu.actions()}>
              {(action) => (
                <button
                  type="button"
                  class={cn(
                    rowClass,
                    action.destructive ? "mt-1 border-t border-border/60 pt-1 text-destructive-text" : "text-foreground",
                  )}
                  onClick={action.onSelect}
                >
                  <span
                    class={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                      action.destructive ? "bg-destructive/10" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <action.Icon class="h-4 w-4" />
                  </span>
                  <span class="min-w-0 flex-1 truncate">{action.label}</span>
                  <Show when={action.trailing}>
                    <span class="text-xs font-semibold text-muted-foreground">{action.trailing}</span>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-border/60 px-3 pt-3">
            <span class="text-sm font-semibold">{t("app.name")}</span>
            <ThemeModeControl variant="compact" />
          </div>
        </div>
      )}
    </Show>
  );
}
