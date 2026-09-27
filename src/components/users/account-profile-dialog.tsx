import { For, Match, Show, Switch, createSignal, type JSX } from "solid-js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconCheck, IconSun, IconUserCog } from "@/components/ui/icons";
import { ThemeModeControl } from "@/components/layout/theme-mode-control";
import { ProfileForm } from "@/components/users/profile-form";
import { cn } from "@/lib/cn";
import { TRENDING_PALETTES } from "@/lib/palettes";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

type Section = "account" | "appearance";

/**
 * Per-user settings, opened from the avatar menu. A left section rail (account
 * profile · appearance) with the matching panel on the right — appearance
 * gathers theme, language and accent colour, all personal browser preferences.
 */
export function AccountProfileDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const [section, setSection] = createSignal<Section>("account");

  const navItem = (id: Section, label: string, icon: JSX.Element) => (
    <button
      type="button"
      onClick={() => setSection(id)}
      aria-current={section() === id ? "page" : undefined}
      class={cn(
        "flex h-10 min-w-0 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring max-sm:flex-1 max-sm:justify-center sm:h-9 sm:w-full touch:h-10",
        section() === id ? "bg-primary/10 text-primary-text" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {icon}
      <span class="truncate">{label}</span>
    </button>
  );

  const seg = (active: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      class={cn(
        "h-10 flex-1 rounded-md px-3 text-sm font-medium sm:h-8 touch:h-10 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <Show when={auth.user()} keyed>
      {(user) => (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
          <DialogContent class="max-w-2xl p-0">
            {/* Phones stack the section rail above the panel as one row (the
                close button keeps the row's right end); from `sm` it is a
                left column. A 160px column beside a 390px screen left the
                form ~130px wide and clipped its fields. */}
            <div class="flex h-[min(85dvh,36rem)] min-h-0 flex-col sm:h-[min(80vh,32rem)] sm:flex-row">
              <nav class="flex shrink-0 items-center gap-1 border-b border-border/70 bg-muted/20 p-2 pr-14 sm:w-40 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:pr-2">
                <DialogTitle class="px-3 pb-2 pt-1.5 text-sm max-sm:sr-only">{t("nav.settings")}</DialogTitle>
                {navItem("account", t("nav.account"), <IconUserCog class="h-4 w-4 shrink-0" />)}
                {navItem("appearance", t("settings.tabAppearance"), <IconSun class="h-4 w-4 shrink-0" />)}
              </nav>

              {/* The account form's save bar is sticky at the bottom of this
                  scroll area, so that section drops the bottom padding — any
                  padding under a sticky bar shows content scrolling past it. */}
              <div class={cn("min-w-0 flex-1 overflow-y-auto p-5 sm:pr-12", section() === "account" && "pb-0")}>
                <Switch>
                  <Match when={section() === "account"}>
                    <ProfileForm
                      user={user}
                      footerClass="pb-5 sm:-mr-12 sm:pr-12"
                      onSaved={async () => {
                        await auth.refresh();
                        props.onOpenChange(false);
                      }}
                    />
                  </Match>

                  <Match when={section() === "appearance"}>
                    <div class="space-y-6">
                      <div class="space-y-2">
                        <p class="text-sm font-semibold">{t("theme.toggle")}</p>
                        <ThemeModeControl variant="segmented" />
                      </div>

                      <div class="space-y-2">
                        <p class="text-sm font-semibold">{t("lang.label")}</p>
                        <div class="flex w-full gap-0.5 rounded-lg bg-muted p-0.5">
                          {seg(prefs.locale() === "tr", t("lang.tr"), () => prefs.setLocale("tr"))}
                          {seg(prefs.locale() === "en", t("lang.en"), () => prefs.setLocale("en"))}
                        </div>
                      </div>

                      <div class="space-y-2">
                        <p class="text-sm font-semibold">{t("settings.colorPalette")}</p>
                        <p class="text-xs text-muted-foreground">{t("settings.colorPaletteHelp")}</p>
                        <div class="grid gap-3 sm:grid-cols-2">
                          <For each={TRENDING_PALETTES}>
                            {(palette) => (
                              <div class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs">
                                <div class="flex h-10" role="group" aria-label={palette.name}>
                                  <For each={palette.colors}>
                                    {(color) => (
                                      <button
                                        type="button"
                                        class="relative flex-1 outline-hidden focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset"
                                        style={{ "background-color": color }}
                                        aria-label={`${palette.name} ${color}`}
                                        aria-pressed={prefs.paletteColor() === color}
                                        title={color}
                                        onClick={() => prefs.setPaletteColor(color)}
                                      >
                                        <Show when={prefs.paletteColor() === color}>
                                          <span class="absolute inset-0 grid place-items-center bg-black/15 text-white">
                                            <IconCheck class="h-4 w-4" />
                                          </span>
                                        </Show>
                                      </button>
                                    )}
                                  </For>
                                </div>
                                <p class="truncate px-3 py-1.5 text-xs font-medium">{palette.name}</p>
                              </div>
                            )}
                          </For>
                        </div>
                        <button
                          type="button"
                          class="h-10 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 sm:h-8 touch:h-10"
                          disabled={prefs.paletteColor() === null}
                          onClick={() => prefs.setPaletteColor(null)}
                        >
                          {t("settings.defaultColor")}
                        </button>
                      </div>
                    </div>
                  </Match>
                </Switch>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Show>
  );
}
