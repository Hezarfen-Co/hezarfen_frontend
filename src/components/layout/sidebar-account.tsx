import { For, Show, createSignal } from "solid-js";
import type { MessageKey } from "@/i18n/messages";
import { AccountProfileDialog } from "@/components/users/account-profile-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronRight, IconLogout } from "@/components/ui/icons";
import { accountDisplayName, createAccountMenu } from "@/components/layout/account-menu";
import { ThemeModeControl } from "@/components/layout/theme-mode-control";
import { UserAvatar } from "@/components/users/user-avatar";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

/** Desktop sidebar footer: the account chip and its dropdown. Phones reach
 *  the same actions as a view inside the menu sheet (MobileAccountPanel). */
export function SidebarAccount(props: {
  collapsed?: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const t = useT();
  const [profileOpen, setProfileOpen] = createSignal(false);
  const menu = createAccountMenu({ onLogout: props.onLogout, onOpenSettings: () => setProfileOpen(true) });
  const actions = () => menu.actions().filter((action) => action.id !== "logout");
  const logout = () => menu.actions().find((action) => action.id === "logout");

  return (
    <>
      <Show when={menu.user()}>
        {(u) => {
          const name = () => accountDisplayName(u());
          return (
          <div class={cn("shrink-0 border-t border-border/80 p-2 dark:border-white/8", props.collapsed && "px-2 py-2") }>
            <DropdownMenu placement="right-end" gutter={8}>
              <DropdownMenuTrigger
                class={cn(
                  "flex w-full items-center text-left outline-hidden transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  props.collapsed
                    ? "h-9 justify-center rounded-md px-0 text-foreground hover:bg-muted/70 data-expanded:bg-muted/70 dark:text-white dark:hover:bg-white/8 dark:data-expanded:bg-white/8"
                    : "h-10 gap-2 rounded-md px-2 text-foreground hover:bg-muted/70 data-expanded:bg-muted/70 dark:text-white dark:hover:bg-white/8 dark:data-expanded:bg-white/8",
                )}
                aria-label={t("nav.account")}
              >
                <UserAvatar
                  userId={u().id}
                  name={name()}
                  hasAvatar={menu.hasAvatar()}
                  size="sm"
                  class={props.collapsed ? "h-9 w-9" : undefined}
                />
                <Show when={!props.collapsed}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-semibold leading-4 2xl:text-sm">{name()}</span>
                    <span class="block truncate text-[11px] font-medium text-muted-foreground dark:text-white/55 2xl:text-[11px]">
                      {t(`role.${u().role}` as MessageKey)}
                    </span>
                  </span>
                  <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/50" />
                </Show>
              </DropdownMenuTrigger>

              <DropdownMenuContent class="w-72 rounded-xl border-border bg-popover p-0 text-popover-foreground shadow-xl shadow-black/10">
                <DropdownMenuItem
                  class="m-1.5 gap-2.5 rounded-xl bg-muted/70 p-2.5 focus:bg-muted data-highlighted:bg-muted dark:bg-white/8 dark:focus:bg-white/10 dark:data-highlighted:bg-white/10"
                  onSelect={menu.openProfile}
                >
                  <UserAvatar userId={u().id} name={name()} hasAvatar={menu.hasAvatar()} size="md" class="ring-0" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{name()}</span>
                    <span class="block truncate text-xs text-muted-foreground dark:text-white/60">@{u().username}</span>
                  </span>
                  <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/50" />
                </DropdownMenuItem>
                <div class="px-1.5 pb-1.5">
                  <For each={actions()}>
                    {(action) => (
                      <DropdownMenuItem
                        class={cn("rounded-lg gap-3", action.id === "profile" && "font-medium")}
                        onSelect={action.onSelect}
                      >
                        <action.Icon class="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/60" />
                        <span class="min-w-0 flex-1">{action.label}</span>
                        <Show when={action.trailing}>
                          <span class="text-xs text-muted-foreground dark:text-white/55">{action.trailing}</span>
                        </Show>
                      </DropdownMenuItem>
                    )}
                  </For>
                </div>
                <DropdownMenuSeparator class="my-0 dark:bg-white/8" />
                <Show when={logout()}>
                  {(action) => (
                    <div class="p-1.5">
                      <DropdownMenuItem destructive class="rounded-lg gap-3" onSelect={action().onSelect}>
                        <IconLogout class="h-4 w-4 shrink-0" />
                        <span>{action().label}</span>
                      </DropdownMenuItem>
                    </div>
                  )}
                </Show>
                <DropdownMenuSeparator class="my-0 dark:bg-white/8" />
                <div class="flex items-center justify-between gap-3 p-3">
                  <span class="font-semibold">{t("app.name")}</span>
                  <ThemeModeControl variant="compact" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          );
        }}
      </Show>
      <AccountProfileDialog open={profileOpen()} onOpenChange={setProfileOpen} />
    </>
  );
}
