import { Show, createSignal } from "solid-js";
import type { User, UserLanguage, UserTheme } from "@/api/types";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

export function UserPreferencesActions(props: {
  user: User;
  onPreferencesChange: (userId: string, body: { theme?: UserTheme | ""; language?: UserLanguage | "" }) => Promise<void>;
}) {
  const t = useT();
  const [theme, setTheme] = createSignal<UserTheme | "">(props.user.theme ?? "");
  const [language, setLanguage] = createSignal<UserLanguage | "">(props.user.language ?? "");
  const dirty = () => theme() !== (props.user.theme ?? "") || language() !== (props.user.language ?? "");

  return (
    <div class="grid gap-2">
      <div class="grid grid-cols-2 gap-2">
        <Select class="h-8 rounded-sm text-xs" value={theme()} aria-label={t("theme.toggle")} onChange={(e) => setTheme(e.currentTarget.value as UserTheme | "")}>
          <option value="">—</option>
          <option value="light">{t("theme.light")}</option>
          <option value="dark">{t("theme.dark")}</option>
        </Select>
        <Select class="h-8 rounded-sm text-xs" value={language()} aria-label={t("lang.label")} onChange={(e) => setLanguage(e.currentTarget.value as UserLanguage | "")}>
          <option value="">—</option>
          <option value="tr">{t("lang.tr")}</option>
          <option value="en">{t("lang.en")}</option>
        </Select>
      </div>
      <Show when={dirty()}>
        {/* "" clears the preference on the backend; null would silently keep it. */}
        <Button type="button" size="sm" class="h-7 rounded-sm px-2" onClick={() => props.onPreferencesChange(props.user.id, { theme: theme(), language: language() })}>
          <IconCheck />
          {t("common.save")}
        </Button>
      </Show>
    </div>
  );
}
