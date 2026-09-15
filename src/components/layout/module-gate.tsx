import { Link, useLocation } from "@tanstack/solid-router";
import { type ParentProps, Show } from "solid-js";
import { IconHome, IconPackage } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { moduleLabel } from "@/lib/module-labels";
import { routeModule } from "@/lib/route-module";
import { useModules } from "@/stores/modules-context";
import { useT } from "@/stores/preferences-context";

/**
 * Stands in for a page whose module the school has switched off. Without it
 * the page mounts, every call 403s, and the user lands on a blank or error
 * screen — typically from a bookmark, a stale tab, or a module turned off
 * mid-session. Unknown module state (loading, lookup failed) renders the page.
 */
export function ModuleGate(props: ParentProps) {
  const t = useT();
  const location = useLocation();
  const modules = useModules();
  const off = () => {
    const module = routeModule(location().pathname);
    const enabled = modules.enabled();
    return module && enabled && !enabled.includes(module) ? module : null;
  };

  // Until the school's list arrives a module page would fire its reads blind;
  // a spinner for that first beat keeps an off module from ever being asked.
  return (
    <Show when={!(routeModule(location().pathname) && modules.loading())} fallback={<PageSpinner />}>
    <Show when={off()} fallback={props.children}>
      {(module) => (
        <div class="flex min-h-[50vh] items-center justify-center px-4 py-16">
          <div class="w-full max-w-[440px] space-y-5 rounded-xl border border-border-line bg-surface-base p-8 text-center shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)]">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-text-subtle">
              <IconPackage class="h-6 w-6" />
            </div>
            <div class="space-y-2">
              <p class="text-base font-semibold text-text-strong">{t("modules.offTitle", { module: moduleLabel(module(), t) })}</p>
              <p class="text-sm leading-[21px] text-text-subtle">{t("modules.offDescription")}</p>
            </div>
            <Link
              to="/"
              class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <IconHome class="mr-1 h-4 w-4" />
              {t("common.goHome")}
            </Link>
          </div>
        </div>
      )}
    </Show>
    </Show>
  );
}
