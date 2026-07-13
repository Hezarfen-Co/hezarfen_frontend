import { usePreferences } from "@/stores/preferences-context";

export function LocaleSwitcher() {
  const prefs = usePreferences();
  return (
    <div class="flex items-center overflow-hidden rounded-md border border-border/70 bg-background/80 p-0.5">
      <button
        type="button"
        class="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        aria-pressed={prefs.locale() === "tr"}
        onClick={() => prefs.setLocale("tr")}
      >
        TR
      </button>
      <button
        type="button"
        class="flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        aria-pressed={prefs.locale() === "en"}
        onClick={() => prefs.setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
