import { useNavigate } from "@tanstack/solid-router";
import { Show, createSignal } from "solid-js";
import type { User } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { AccountProfileDialog } from "@/components/users/account-profile-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronRight, IconGlobe, IconGuide, IconLogout, IconSettings } from "@/components/ui/icons";
import { ThemeModeControl } from "@/components/layout/theme-mode-control";
import { UserAvatar } from "@/components/users/user-avatar";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

function displayName(user: User) {
  return [user.name, user.surname].filter(Boolean).join(" ").trim() || user.username;
}

export function SidebarAccount(props: { collapsed?: boolean; onLogout: () => void | Promise<void> }) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = createSignal(false);

  return (
    <>
      <Show when={auth.user()}>
        {(u) => {
          const name = () => displayName(u());
          return (
          <div class={cn("shrink-0 border-t border-border/80 p-2 dark:border-white/8", props.collapsed && "px-2 py-2") }>
            <DropdownMenu placement="right-end" gutter={8}>
              <DropdownMenuTrigger
                class={cn(
                  "flex w-full items-center text-left outline-hidden transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-white/30",
                  props.collapsed
                    ? "h-9 justify-center rounded-md px-0 text-foreground hover:bg-muted/70 data-expanded:bg-muted/70 dark:text-white dark:hover:bg-white/8 dark:data-expanded:bg-white/8"
                    : "h-10 gap-2 rounded-md px-2 text-foreground hover:bg-muted/70 data-expanded:bg-muted/70 dark:text-white dark:hover:bg-white/8 dark:data-expanded:bg-white/8",
                )}
                aria-label={t("nav.account")}
              >
                <UserAvatar
                  userId={u().id}
                  name={name()}
                  size="sm"
                  class={props.collapsed ? "h-9 w-9" : undefined}
                />
                <Show when={!props.collapsed}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-semibold leading-4 2xl:text-sm">{name()}</span>
                    <span class="block truncate text-[10px] font-medium text-muted-foreground dark:text-white/55 2xl:text-[11px]">
                      {t(`role.${u().role}` as MessageKey)}
                    </span>
                  </span>
                  <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/50" />
                </Show>
              </DropdownMenuTrigger>

              <DropdownMenuContent class="w-72 rounded-xl border-border bg-popover p-0 text-popover-foreground shadow-xl shadow-black/10">
                <DropdownMenuItem
                  class="m-1.5 gap-2.5 rounded-xl bg-muted/70 p-2.5 focus:bg-muted data-highlighted:bg-muted dark:bg-white/8 dark:focus:bg-white/10 dark:data-highlighted:bg-white/10"
                  onSelect={() => void navigate({ to: "/profile/me" })}
                >
                  <UserAvatar userId={u().id} name={name()} size="md" class="ring-0" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{name()}</span>
                    <span class="block truncate text-xs text-muted-foreground dark:text-white/60">{t("profile.myProfile")}</span>
                  </span>
                  <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/50" />
                </DropdownMenuItem>
                <div class="px-1.5 pb-1.5">
                <DropdownMenuItem class="rounded-lg gap-3" onSelect={() => setProfileOpen(true)}>
                  <IconSettings class="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/60" />
                  <span>{t("nav.settings")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg gap-3" onSelect={() => void navigate({ to: "/guide" })}>
                  <IconGuide class="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/60" />
                  <span>{t("nav.guide")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg gap-3" onSelect={() => prefs.setLocale(prefs.locale() === "tr" ? "en" : "tr")}>
                  <IconGlobe class="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/60" />
                  <span class="min-w-0 flex-1">{t("lang.label")}</span>
                  <span class="text-xs text-muted-foreground dark:text-white/55">{prefs.locale() === "tr" ? "TR" : "EN"}</span>
                </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator class="my-0 dark:bg-white/8" />
                <div class="p-1.5">
                <DropdownMenuItem destructive class="rounded-lg gap-3" onSelect={() => void props.onLogout()}>
                  <IconLogout class="h-4 w-4 shrink-0" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
                </div>
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
