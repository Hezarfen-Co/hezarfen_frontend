import { IconSearch } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { openCommandPalette } from "@/stores/command-palette";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

/** The home page's search field: the one visible door into the command
 *  palette now that the topbar no longer carries it (Ctrl/Cmd K still works). */
export function CommandSearchField(props: { class?: string }) {
  const t = useT();
  const auth = useAuth();
  const placeholder = () =>
    auth.user()?.role === "admin" ? t("dashboard.hero.searchPlaceholderAdmin") : t("dashboard.hero.searchPlaceholderAll");

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      class={cn(
        "group flex h-[46px] w-full max-w-xl items-center gap-3 rounded-lg border border-border-line bg-surface-base pl-4 pr-2 text-left text-sm shadow-sm outline-hidden transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
        props.class,
      )}
      aria-label={t("dashboard.commandCenter")}
    >
      <IconSearch class="h-4 w-4 shrink-0 text-text-subtle group-hover:text-primary" />
      <span class="min-w-0 flex-1 truncate text-text-placeholder">{placeholder()}</span>
      <kbd class="hidden shrink-0 rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-block">
        Ctrl/Cmd K
      </kbd>
    </button>
  );
}
