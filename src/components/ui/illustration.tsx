import { createResource } from "solid-js";
import { cn } from "@/lib/cn";
import { loadIllustration, type IllustrationName } from "@/lib/illustrations";

/** Decorative, theme-tinted unDraw scene. Loaded on demand so empty states
 *  don't pull every SVG into the main bundle. */
export function Illustration(props: { name: IllustrationName; class?: string }) {
  const [svg] = createResource(() => props.name, loadIllustration);

  return (
    <span
      class={cn("illustration pointer-events-none block select-none [&>svg]:h-full [&>svg]:w-full", props.class)}
      aria-hidden="true"
      // Local, build-time assets only — never user content.
      innerHTML={svg.latest ?? ""}
    />
  );
}
