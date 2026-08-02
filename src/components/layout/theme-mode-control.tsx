import { IconMoon, IconSun } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/stores/preferences-context";

type ThemeModeControlProps = {
  variant: "toggle" | "compact" | "segmented" | "cards";
};

/** Shared theme control with layouts suited to each navigation surface. */
export function ThemeModeControl(props: ThemeModeControlProps) {
  const prefs = usePreferences();
  const isDark = () => prefs.theme() === "dark";
  const selectTheme = (theme: "light" | "dark") => prefs.setTheme(theme);
  const lightLabel = () => prefs.t("theme.light");
  const darkLabel = () => prefs.t("theme.dark");

  if (props.variant === "toggle") {
    return (
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={prefs.t("theme.toggle")}
        title={isDark() ? lightLabel() : darkLabel()}
        onClick={() => selectTheme(isDark() ? "light" : "dark")}
      >
        {isDark() ? <IconSun class="h-4 w-4" /> : <IconMoon class="h-4 w-4" />}
      </button>
    );
  }

  if (props.variant === "compact") {
    return (
      <div class="flex rounded-lg bg-muted p-0.5 dark:bg-white/8" role="group" aria-label={prefs.t("theme.toggle")}>
        <button type="button" class={cn("rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground dark:text-white/60 dark:hover:text-white", !isDark() && "bg-background text-foreground shadow-xs dark:bg-white/12 dark:text-white")} onClick={() => selectTheme("light")} aria-pressed={!isDark()} title={lightLabel()}>
          <IconSun class="h-4 w-4" />
        </button>
        <button type="button" class={cn("rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground dark:text-white/60 dark:hover:text-white", isDark() && "bg-background text-foreground shadow-xs dark:bg-white/12 dark:text-white")} onClick={() => selectTheme("dark")} aria-pressed={isDark()} title={darkLabel()}>
          <IconMoon class="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (props.variant === "segmented") {
    return (
      <div class="flex w-full gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label={prefs.t("theme.toggle")}>
        <button type="button" aria-pressed={!isDark()} onClick={() => selectTheme("light")} class={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring", !isDark() ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>{lightLabel()}</button>
        <button type="button" aria-pressed={isDark()} onClick={() => selectTheme("dark")} class={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring", isDark() ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>{darkLabel()}</button>
      </div>
    );
  }

  return (
    <div class="grid grid-cols-2 gap-2" role="group" aria-label={prefs.t("theme.toggle")}>
      <button type="button" role="menuitemradio" aria-checked={!isDark()} class={cn("flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2.5 text-center text-xs font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring", !isDark() ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground")} onClick={() => selectTheme("light")}>
        <span class="flex h-7 w-7 items-center justify-center"><IconSun class="h-5 w-5" /></span>
        <span class="leading-tight">{lightLabel()}</span>
      </button>
      <button type="button" role="menuitemradio" aria-checked={isDark()} class={cn("flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2.5 text-center text-xs font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring", isDark() ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground")} onClick={() => selectTheme("dark")}>
        <span class="flex h-7 w-7 items-center justify-center"><IconMoon class="h-5 w-5" /></span>
        <span class="leading-tight">{darkLabel()}</span>
      </button>
    </div>
  );
}
