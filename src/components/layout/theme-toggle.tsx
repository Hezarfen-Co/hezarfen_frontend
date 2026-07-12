import { IconSun, IconMoon } from "@/components/ui/icons";
import { usePreferences } from "@/stores/preferences-context";

export function ThemeToggle() {
  const prefs = usePreferences();
  return (
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label={prefs.t("theme.toggle")}
      title={prefs.theme() === "dark" ? prefs.t("theme.light") : prefs.t("theme.dark")}
      onClick={() => prefs.toggleTheme()}
    >
      {prefs.theme() === "dark" ? <IconSun class="h-4 w-4" /> : <IconMoon class="h-4 w-4" />}
    </button>
  );
}
