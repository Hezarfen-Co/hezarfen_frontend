import { For, Show } from "solid-js";
import type { ModuleCatalog } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { moduleLabel, packageLabel } from "@/lib/module-labels";
import { useT } from "@/stores/preferences-context";

/**
 * The deployment catalog grouped by package, each module marked on/off for one
 * school. Read-only without `onToggle` (a school admin's view); with it, every
 * module row becomes a switch (the builder's switchboard).
 */
export function ModuleCatalogGrid(props: {
  catalog: ModuleCatalog;
  enabled: readonly string[];
  onToggle?: (module: string, next: boolean) => void;
  onTogglePackage?: (pkg: string, next: boolean) => void;
  disabled?: boolean;
  /** One column regardless of viewport — for narrow hosts like a SidePanel. */
  stacked?: boolean;
}) {
  const t = useT();
  const isOn = (module: string) => props.enabled.includes(module);
  const requiresOf = (module: string) => props.catalog.modules.find((entry) => entry.module === module)?.requires ?? [];

  return (
    <div class={props.stacked ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
      <For each={props.catalog.packages}>
        {(pkg) => {
          const onCount = () => pkg.modules.filter(isOn).length;
          return (
            <section class="data-shell space-y-3 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="truncate font-semibold text-text-strong">{packageLabel(pkg.package, t)}</h2>
                  <p class="text-xs text-text-subtle">{t("modules.enabledCount", { on: String(onCount()), total: String(pkg.modules.length) })}</p>
                </div>
                <Show when={props.onTogglePackage}>
                  {(toggle) => (
                    <div class="flex shrink-0 gap-2">
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted/60 disabled:opacity-50"
                        disabled={props.disabled || onCount() === pkg.modules.length}
                        onClick={() => toggle()(pkg.package, true)}
                      >
                        {t("modules.enableAll")}
                      </button>
                      <button
                        type="button"
                        class="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
                        disabled={props.disabled || onCount() === 0}
                        onClick={() => toggle()(pkg.package, false)}
                      >
                        {t("modules.disableAll")}
                      </button>
                    </div>
                  )}
                </Show>
              </div>
              <ul class="divide-y divide-border-hairline">
                <For each={pkg.modules}>
                  {(module) => (
                    <li class="flex items-center justify-between gap-3 py-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-foreground">{moduleLabel(module, t)}</p>
                        <Show when={requiresOf(module).length > 0}>
                          <p class="truncate text-xs text-text-subtle">
                            {t("modules.requires")}: {requiresOf(module).map((name) => moduleLabel(name, t)).join(", ")}
                          </p>
                        </Show>
                      </div>
                      <Show
                        when={props.onToggle}
                        fallback={
                          <Badge variant={isOn(module) ? "success" : "secondary"} class="shrink-0 rounded-full">
                            {isOn(module) ? t("modules.on") : t("modules.off")}
                          </Badge>
                        }
                      >
                        {(toggle) => (
                          <label class="relative shrink-0 cursor-pointer" title={moduleLabel(module, t)}>
                            <input
                              type="checkbox"
                              class="peer sr-only"
                              aria-label={moduleLabel(module, t)}
                              checked={isOn(module)}
                              disabled={props.disabled}
                              onChange={(event) => {
                                const next = event.currentTarget.checked;
                                // The switch shows `enabled`, not the click: snap back
                                // now and let a successful write move it, so a refused
                                // (409) toggle never leaves it in the wrong position.
                                event.currentTarget.checked = isOn(module);
                                toggle()(module, next);
                              }}
                            />
                            <span class="block h-6 w-10 rounded-full bg-input ring-1 ring-inset ring-black/5 transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:ring-white/10" />
                            <span class="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                          </label>
                        )}
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          );
        }}
      </For>
    </div>
  );
}
