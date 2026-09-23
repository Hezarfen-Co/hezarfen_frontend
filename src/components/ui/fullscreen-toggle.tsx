import { Show } from "solid-js";
import { IconMaximize, IconMinimize } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/**
 * Icon button that enters/leaves full screen for a drawing surface. State lives
 * in the host's `createFullscreen()` (src/lib/fullscreen.ts); this only renders.
 */
export function FullscreenToggle(props: { active: boolean; onToggle: () => void; class?: string }) {
  const t = useT();
  const label = () => (props.active ? t("draw.exitFullscreen") : t("draw.fullscreen"));
  return (
    <button
      type="button"
      class={cn(
        "flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        props.class,
      )}
      title={label()}
      aria-label={label()}
      aria-pressed={props.active}
      onClick={() => props.onToggle()}
    >
      <Show when={props.active} fallback={<IconMaximize class="h-5 w-5" />}>
        <IconMinimize class="h-5 w-5" />
      </Show>
    </button>
  );
}
