import { Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { Locale } from "@/i18n/messages";
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
import { IconGlobe, IconLogout, IconMoon, IconSun } from "@/components/ui/icons";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

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
              "inline-flex h-9 max-w-[12rem] items-center gap-2 rounded-md border border-input bg-background px-1.5 pr-2 text-sm shadow-sm outline-none transition-colors sm:max-w-none",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring",
              "data-[expanded]:bg-accent data-[expanded]:text-accent-foreground",
            )}
            aria-label={t("nav.account")}
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
              {initials(u().username)}
            </span>
            <span class="hidden min-w-0 truncate font-medium sm:inline">{u().username}</span>
            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4 shrink-0 opacity-50"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </DropdownMenuTrigger>

          <DropdownMenuContent class="w-[min(16rem,calc(100vw-1.5rem))]">
            <div class="flex items-center gap-2 p-2">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {initials(u().username)}
              </span>
              <div class="flex min-w-0 flex-col gap-1">
                <p class="truncate text-sm font-medium leading-none">{u().username}</p>
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
