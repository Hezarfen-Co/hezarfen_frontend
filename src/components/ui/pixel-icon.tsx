import chevronDown from "pixelarticons/svg/chevron-down.svg?raw";
import chevronUp from "pixelarticons/svg/chevron-up.svg?raw";
import checkDouble from "pixelarticons/svg/check-double.svg?raw";
import checkboxOn from "pixelarticons/svg/checkbox-on.svg?raw";
import bookOpen from "pixelarticons/svg/book-open.svg?raw";
import calendarWeeks from "pixelarticons/svg/calendar-weeks.svg?raw";
import crown from "pixelarticons/svg/crown.svg?raw";
import fire from "pixelarticons/svg/fire.svg?raw";
import hourglass from "pixelarticons/svg/hourglass.svg?raw";
import lock from "pixelarticons/svg/lock.svg?raw";
import messageText from "pixelarticons/svg/message-text.svg?raw";
import notes from "pixelarticons/svg/notes.svg?raw";
import penSquare from "pixelarticons/svg/pen-square.svg?raw";
import pencil from "pixelarticons/svg/pencil.svg?raw";
import sparkles from "pixelarticons/svg/sparkles.svg?raw";
import star from "pixelarticons/svg/star.svg?raw";
import trophy from "pixelarticons/svg/trophy.svg?raw";
import users from "pixelarticons/svg/users.svg?raw";
import zap from "pixelarticons/svg/zap.svg?raw";
import { cn } from "@/lib/cn";

// Pixel-art glyphs from pixelarticons (MIT, https://pixelarticons.com). Only
// the handful the profile uses are imported, so the rest never reach a bundle.
const ICONS = {
  "book-open": bookOpen,
  "calendar-weeks": calendarWeeks,
  "check-double": checkDouble,
  "chevron-down": chevronDown,
  "chevron-up": chevronUp,
  "checkbox-on": checkboxOn,
  crown,
  fire,
  hourglass,
  lock,
  "message-text": messageText,
  notes,
  "pen-square": penSquare,
  pencil,
  sparkles,
  star,
  trophy,
  users,
  zap,
} as const;

export type PixelIconName = keyof typeof ICONS;

const sized = (svg: string) =>
  svg
    .replace(/\s(?:width|height)="[^"]*"/g, "")
    .replace("<svg", '<svg aria-hidden="true" focusable="false" shape-rendering="crispEdges"');

export function PixelIcon(props: { name: PixelIconName; class?: string }) {
  return <span class={cn("inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full", props.class ?? "h-4 w-4")} innerHTML={sized(ICONS[props.name])} />;
}
