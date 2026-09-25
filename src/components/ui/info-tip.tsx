import { createSignal } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IconInfo } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/**
 * A circled "i" that reveals an explanatory note — for a line that explains a
 * column or a table and would otherwise sit on screen all the time.
 *
 * Hover and keyboard focus open it like a tooltip; a click or a tap pins it
 * open (a tooltip alone never opens on touch), and a second click, Escape, a
 * tap elsewhere or moving focus away closes it again.
 */
export function InfoTip(props: {
  text: string;
  /** Accessible name of the button; defaults to "Bilgi" / "More info". */
  label?: string;
  class?: string;
}) {
  const t = useT();
  let trigger: HTMLButtonElement | undefined;
  const [hoverOpen, setHoverOpen] = createSignal(false);
  const [pinned, setPinned] = createSignal(false);
  return (
    <Tooltip
      open={hoverOpen() || pinned()}
      onOpenChange={setHoverOpen}
      openDelay={150}
      closeDelay={100}
      placement="top"
      gutter={6}
    >
      <TooltipTrigger
        ref={trigger}
        type="button"
        aria-label={props.label ?? t("common.info")}
        data-info-tip=""
        class={cn(
          "inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-hidden transition-colors",
          "hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          // A bigger hit area on touch without changing the header's height.
          "touch:relative touch:after:absolute touch:after:-inset-2.5 touch:after:content-['']",
          pinned() && "text-foreground",
          props.class,
        )}
        onClick={(event: MouseEvent) => {
          // Never reach a sortable header or a clickable row around it.
          event.stopPropagation();
          setPinned((value) => !value);
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        }}
        onBlur={() => setPinned(false)}
      >
        <IconInfo class="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent
        class="max-w-72 text-left text-xs leading-5 font-normal normal-case tracking-normal whitespace-normal"
        onEscapeKeyDown={() => setPinned(false)}
        onPointerDownOutside={(event) => {
          // A tap on the icon itself is its own toggle, not "outside".
          const target = event.detail.originalEvent.target as Node | null;
          if (trigger && target && trigger.contains(target)) return;
          setPinned(false);
        }}
      >
        {props.text}
      </TooltipContent>
    </Tooltip>
  );
}
