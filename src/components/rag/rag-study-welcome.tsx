import { LogoMark } from "@/components/brand/logo-mark";

/**
 * The landing screen as Vibe draws it: the brand mark and one greeting line,
 * left-aligned on the composer's own column, right above the composer.
 */
export function RagStudyWelcome(props: { title: string }) {
  return (
    <div class="flex flex-col items-start gap-4 pb-5">
      <LogoMark size={40} />
      <h2 class="text-3xl font-medium tracking-tight text-text-strong sm:text-[2.1rem]">{props.title}</h2>
    </div>
  );
}
