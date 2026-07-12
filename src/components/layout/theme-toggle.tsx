import { Button } from "@/components/ui/button";
import { usePreferences } from "@/stores/preferences-context";

export function ThemeToggle() {
  const prefs = usePreferences();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="h-9 w-9 rounded-sm px-0"
      aria-label={prefs.t("theme.toggle")}
      title={prefs.theme() === "dark" ? prefs.t("theme.light") : prefs.t("theme.dark")}
      onClick={() => prefs.toggleTheme()}
    >
      <span class="text-base leading-none" aria-hidden>
        {prefs.theme() === "dark" ? "☀" : "☾"}
      </span>
    </Button>
  );
}
