import { Select } from "@/components/ui/select";
import { usePreferences } from "@/stores/preferences-context";
import type { Locale } from "@/i18n/messages";

export function LocaleSwitcher() {
  const prefs = usePreferences();
  return (
    <Select
      class="h-9 w-[7.5rem] rounded-sm border-border/80 bg-background/80 text-xs font-medium"
      aria-label={prefs.t("lang.label")}
      value={prefs.locale()}
      onChange={(e) => prefs.setLocale(e.currentTarget.value as Locale)}
    >
      <option value="en">{prefs.t("lang.en")}</option>
      <option value="tr">{prefs.t("lang.tr")}</option>
    </Select>
  );
}
