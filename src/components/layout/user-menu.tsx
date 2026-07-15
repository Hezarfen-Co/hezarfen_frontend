import { Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { Locale, MessageKey } from "@/i18n/messages";
import { RoleBadge } from "@/components/layout/role-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronDown, IconEdit, IconGlobe, IconLogout, IconMoon, IconSun } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";
import type { User } from "@/api/types";

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function displayName(user: User) {
  const fullName = [user.name, user.surname].filter(Boolean).join(" ");
  return titleCase(fullName || user.username);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ChoiceButton(props: {
  active?: boolean;
  label: string;
  icon: any;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={props.active}
      class={cn(
        "flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2.5 text-center text-xs font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        props.active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={props.onSelect}
    >
      <span class="flex h-7 w-7 items-center justify-center">{props.icon}</span>
      <span class="leading-tight">{props.label}</span>
    </button>
  );
}

export function UserMenu() {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();

  const onLogout = async () => {
    await auth.logout();
    void navigate({ to: "/login" });
  };

  return (
    <Show when={auth.user()}>
      {(u) => (
        <DropdownMenu placement="bottom-end" gutter={8}>
          <DropdownMenuTrigger
            class={cn(
              "inline-flex h-11 max-w-[16rem] items-center gap-2.5 rounded-lg border border-input bg-background px-2.5 pr-3 text-sm shadow-sm outline-none transition-colors sm:max-w-[22rem]",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring",
              "data-[expanded]:bg-accent data-[expanded]:text-accent-foreground",
            )}
            aria-label={t("nav.account")}
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
              {initials(displayName(u()))}
            </span>
            <span class="hidden min-w-0 flex-col text-left leading-tight sm:flex">
              <span class="truncate font-semibold">{displayName(u())}</span>
              <span class="truncate text-[11px] font-medium text-muted-foreground">{t(`role.${u().role}` as MessageKey)}</span>
            </span>
            <IconChevronDown class="h-4 w-4 shrink-0 opacity-50" />
          </DropdownMenuTrigger>

          <DropdownMenuContent class="w-[min(20rem,calc(100vw-1.5rem))]">
            <div class="flex items-center gap-3 p-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                {initials(displayName(u()))}
              </span>
              <div class="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold leading-tight">{displayName(u())}</p>
                  <p class="truncate text-xs text-muted-foreground">@{u().username}</p>
                </div>
                <RoleBadge role={u().role} />
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Language submenu — centered icon grid */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger class="gap-2">
                <IconGlobe class="h-4 w-4 shrink-0" />
                <span class="min-w-0 flex-1 truncate text-left">{t("lang.label")}</span>
                <span class="shrink-0 text-xs font-medium text-muted-foreground">
                  {prefs.locale() === "tr" ? "TR" : "EN"}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-[min(12.5rem,calc(100vw-2rem))] p-2">
                <div class="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    active={prefs.locale() === "tr"}
                    label="TR"
                    icon={<IconGlobe class="h-5 w-5" />}
                    onSelect={() => prefs.setLocale("tr" as Locale)}
                  />
                  <ChoiceButton
                    active={prefs.locale() === "en"}
                    label="EN"
                    icon={<IconGlobe class="h-5 w-5" />}
                    onSelect={() => prefs.setLocale("en" as Locale)}
                  />
                </div>
                <p class="mt-2 text-center text-[11px] text-muted-foreground">
                  {prefs.locale() === "tr" ? t("lang.tr") : t("lang.en")}
                </p>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Theme submenu — centered icon grid */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger class="gap-2">
                <Show when={prefs.theme() === "dark"} fallback={<IconSun class="h-4 w-4 shrink-0" />}>
                  <IconMoon class="h-4 w-4 shrink-0" />
                </Show>
                <span class="min-w-0 flex-1 truncate text-left">{t("theme.toggle")}</span>
                <span class="max-w-[4.5rem] shrink-0 truncate text-xs font-medium text-muted-foreground">
                  {prefs.theme() === "dark" ? t("theme.dark") : t("theme.light")}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-[min(12.5rem,calc(100vw-2rem))] p-2">
                <div class="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    active={prefs.theme() === "light"}
                    label={t("theme.light")}
                    icon={<IconSun class="h-5 w-5" />}
                    onSelect={() => prefs.setTheme("light")}
                  />
                  <ChoiceButton
                    active={prefs.theme() === "dark"}
                    label={t("theme.dark")}
                    icon={<IconMoon class="h-5 w-5" />}
                    onSelect={() => prefs.setTheme("dark")}
                  />
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => void navigate({ to: "/profile" })}>
              <IconEdit class="h-4 w-4 shrink-0" />
              <span>{t("profile.edit")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem destructive onSelect={() => void onLogout()}>
              <IconLogout class="h-4 w-4 shrink-0" />
              <span>{t("nav.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Show>
  );
}
