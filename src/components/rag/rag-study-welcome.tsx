import { IconSparkles } from "@/components/ui/icons";

/** The Study tab before the first question: what it answers from, nothing more. */
export function RagStudyWelcome(props: { title: string; hint: string }) {
  return (
    <div class="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-10 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary-text">
        <IconSparkles class="h-6 w-6" />
      </span>
      <h2 class="text-xl font-semibold tracking-tight text-text-strong">{props.title}</h2>
      <p class="max-w-md text-sm leading-6 text-muted-foreground">{props.hint}</p>
    </div>
  );
}
