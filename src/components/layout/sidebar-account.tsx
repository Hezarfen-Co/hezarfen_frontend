import { useNavigate } from "@tanstack/solid-router";
import { Show } from "solid-js";
import type { User } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronRight, IconGlobe, IconLogout, IconMoon, IconSun } from "@/components/ui/icons";
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

  return (
    <Show when={auth.user()}>
      {(u) => {
        const name = () => displayName(u());
        return (
          <div class={cn("shrink-0 border-t border-border/80 p-3", props.collapsed && "px-2")}>
            <DropdownMenu placement="right-end" gutter={8}>
              <DropdownMenuTrigger
                class={cn(
                  "flex w-full items-center rounded-xl border border-border/80 bg-muted/35 text-left outline-none transition-colors",
                  "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-muted/70",
                  props.collapsed ? "h-11 justify-center px-0" : "gap-3 p-2",
                )}
                aria-label={t("nav.account")}
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials(name())}
                </span>
                <Show when={!props.collapsed}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{name()}</span>
                    <span class="block truncate text-xs text-muted-foreground">{t(`role.${u().role}` as MessageKey)}</span>
                  </span>
                  <IconChevronRight class="h-4 w-4 text-muted-foreground" />
                </Show>
              </DropdownMenuTrigger>

              <DropdownMenuContent class="w-52 rounded-xl border-border/80 bg-popover p-1.5 shadow-soft">
                <DropdownMenuItem class="rounded-lg" onSelect={() => void navigate({ to: "/profile" })}>
                  <span>{t("profile.edit")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg" onSelect={() => prefs.toggleTheme()}>
                  <Show when={prefs.theme() === "dark"} fallback={<IconSun class="h-4 w-4 shrink-0" />}>
                    <IconMoon class="h-4 w-4 shrink-0" />
                  </Show>
                  <span class="min-w-0 flex-1">{t("theme.toggle")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.theme() === "dark" ? t("theme.dark") : t("theme.light")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-lg" onSelect={() => prefs.setLocale(prefs.locale() === "tr" ? "en" : "tr")}>
                  <IconGlobe class="h-4 w-4 shrink-0" />
                  <span class="min-w-0 flex-1">{t("lang.label")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.locale() === "tr" ? "TR" : "EN"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive class="rounded-lg" onSelect={() => void props.onLogout()}>
                  <IconLogout class="h-4 w-4 shrink-0" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }}
    </Show>
  );
}
