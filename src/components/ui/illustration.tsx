import { createEffect, createSignal, onCleanup } from "solid-js";
import { cn } from "@/lib/cn";
import { loadIllustration, type IllustrationName } from "@/lib/illustrations";

/** Decorative, theme-tinted unDraw scene. Loaded on demand so empty states
 *  don't pull every SVG into the main bundle.
 *
 *  A plain signal, not a resource: a resource read suspends the nearest
 *  <Suspense> until the SVG lands, and a table's "no results" state then
 *  remounted the whole table — the search box lost focus mid-typing. */
export function Illustration(props: { name: IllustrationName; class?: string }) {
  const [svg, setSvg] = createSignal("");
  createEffect(() => {
    const name = props.name;
    let current = true;
    void loadIllustration(name).then((markup) => {
      if (current) setSvg(markup);
    }, () => {});
    onCleanup(() => {
      current = false;
    });
  });

  return (
    <span
      class={cn("illustration pointer-events-none block select-none [&>svg]:h-full [&>svg]:w-full", props.class)}
      aria-hidden="true"
      // Local, build-time assets only — never user content.
      innerHTML={svg()}
    />
  );
}
