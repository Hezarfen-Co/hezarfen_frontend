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
import { IconChevronRight, IconEdit, IconGlobe, IconGuide, IconLogout, IconMoon, IconSun } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "H";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

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
          <div class={cn("shrink-0 border-t border-border/80 p-2", props.collapsed && "px-2 py-2") }>
            <DropdownMenu placement="right-end" gutter={8}>
              <DropdownMenuTrigger
                class={cn(
                  "flex w-full items-center text-left outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  props.collapsed
                    ? "h-11 justify-center rounded-xl px-0 hover:bg-muted/70 data-[expanded]:bg-muted/70"
                    : "h-12 gap-2 rounded-xl border border-border/80 bg-card/70 px-2 shadow-sm hover:bg-muted/50 data-[expanded]:bg-muted/50",
                )}
                aria-label={t("nav.account")}
              >
                <span
                  class={cn(
                    "flex shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm ring-1 ring-border/70",
                    props.collapsed ? "h-9 w-9" : "h-8 w-8",
                  )}
                >
                  {initials(name())}
                </span>
                <Show when={!props.collapsed}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-semibold leading-4">{name()}</span>
                    <span class="block truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      {t(`role.${u().role}` as MessageKey)}
                    </span>
                  </span>
                  <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Show>
              </DropdownMenuTrigger>

              <DropdownMenuContent class="w-52 rounded-2xl border-black/[0.08] bg-popover/95 p-1.5 shadow-apple backdrop-blur-xl dark:border-white/[0.12]">
                <DropdownMenuItem class="rounded-xl gap-2" onSelect={() => setProfileOpen(true)}>
                  <IconEdit class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{t("profile.edit")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="rounded-xl gap-2" onSelect={() => prefs.toggleTheme()}>
                  <Show when={prefs.theme() === "dark"} fallback={<IconSun class="h-4 w-4 shrink-0 text-muted-foreground" />}>
                    <IconMoon class="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Show>
                  <span class="min-w-0 flex-1">{t("theme.toggle")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.theme() === "dark" ? t("theme.dark") : t("theme.light")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-xl gap-2" onSelect={() => prefs.setLocale(prefs.locale() === "tr" ? "en" : "tr")}>
                  <IconGlobe class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="min-w-0 flex-1">{t("lang.label")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.locale() === "tr" ? "TR" : "EN"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-xl gap-2" onSelect={() => void navigate({ to: "/guide" })}>
                  <IconGuide class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{t("nav.guide")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive class="rounded-xl gap-2" onSelect={() => void props.onLogout()}>
                  <IconLogout class="h-4 w-4 shrink-0" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
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
