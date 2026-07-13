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
          <div class={cn("shrink-0 border-t border-border/80 p-2 pb-1.5", props.collapsed && "px-2")}>
            <DropdownMenu placement="right-end" gutter={8}>
              <DropdownMenuTrigger
                class={cn(
                  "flex w-full items-center rounded-md text-left outline-none transition-colors",
                  "hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring data-[expanded]:bg-muted/70",
                  props.collapsed ? "h-9 justify-center px-0" : "gap-1.5 px-2",
                  props.collapsed ? "" : "h-10",
                )}
                aria-label={t("nav.account")}
              >
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {initials(name())}
                </span>
                <Show when={!props.collapsed}>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{name()}</span>
                    <span class="block text-[10px] text-muted-foreground">{t(`role.${u().role}` as MessageKey)}</span>
                  </span>
                  <IconChevronRight class="h-4 w-4 shrink-0 text-muted-foreground transition-transform data-[expanded]:rotate-90" />
                </Show>
              </DropdownMenuTrigger>

              <DropdownMenuContent class="w-52 rounded-lg border-border/80 bg-popover p-1 shadow-soft">
                <DropdownMenuItem class="rounded-md" onSelect={() => void navigate({ to: "/profile" })}>
                  <IconChevronRight class="h-4 w-4 shrink-0" />
                  <span>{t("profile.edit")}</span>
                </DropdownMenuItem>
                <p class="px-2 text-center text-[10px] tracking-[0.2em] text-muted-foreground/40 select-none">······</p>
                <DropdownMenuItem class="rounded-md" onSelect={() => prefs.toggleTheme()}>
                  <Show when={prefs.theme() === "dark"} fallback={<IconSun class="h-4 w-4 shrink-0" />}>
                    <IconMoon class="h-4 w-4 shrink-0" />
                  </Show>
                  <span class="min-w-0 flex-1">{t("theme.toggle")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.theme() === "dark" ? t("theme.dark") : t("theme.light")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-md" onSelect={() => prefs.setLocale(prefs.locale() === "tr" ? "en" : "tr")}>
                  <IconGlobe class="h-4 w-4 shrink-0" />
                  <span class="min-w-0 flex-1">{t("lang.label")}</span>
                  <span class="text-xs text-muted-foreground">{prefs.locale() === "tr" ? "TR" : "EN"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive class="rounded-md" onSelect={() => void props.onLogout()}>
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
