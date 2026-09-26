import type { ParentProps } from "solid-js";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";

/**
 * The collapsed sidebar's label tooltip. The rail shows icons only, so each
 * control names itself to the right of the rail on hover and on keyboard
 * focus. Wrap a `TooltipTrigger` (usually with `as={...}` so the real control
 * is the trigger); with `enabled` off the tooltip never opens, which is how
 * the expanded sidebar, whose rows carry visible labels, stays quiet.
 */
export function RailTip(props: ParentProps<{ label: string; enabled: boolean }>) {
  return (
    // `open={false}` as well as `disabled`: a tip already open when the rail
    // expands (the collapse toggle, clicked) must close, not linger.
    <Tooltip
      placement="right"
      gutter={12}
      openDelay={200}
      closeDelay={0}
      disabled={!props.enabled}
      open={props.enabled ? undefined : false}
    >
      {props.children}
      <TooltipContent class="px-2.5 py-1.5 font-medium">{props.label}</TooltipContent>
    </Tooltip>
  );
}
