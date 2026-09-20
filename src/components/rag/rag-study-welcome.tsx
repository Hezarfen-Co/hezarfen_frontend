import { IconSparkles } from "@/components/ui/icons";

/**
 * The landing screen, which is really just the brand mark above the composer.
 * The old version was a bordered illustration block that pushed the composer to
 * the bottom edge; here the mark introduces the composer and nothing else
 * competes with it — the page's whole job is "start typing".
 */
export function RagStudyWelcome(props: { title: string; hint: string }) {
  return (
    <div class="flex flex-col items-center gap-3 pb-6 text-center">
      <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary-text">
        <IconSparkles class="h-5 w-5" />
      </span>
      <h2 class="text-2xl font-semibold tracking-tight text-text-strong">{props.title}</h2>
      <p class="max-w-md text-sm leading-6 text-muted-foreground">{props.hint}</p>
    </div>
  );
}
