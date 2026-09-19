import { Show, createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy, IconPlus } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

/** One AI-generated practice question with its range-bounded answer. */
export function GeneratedQuestionCard(props: {
  index: number;
  question: string;
  answer: string;
  /** Absent when the school has no question bank. */
  onAddToBank?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${props.question}\n\n${props.answer}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); nothing to undo.
    }
  };

  return (
    <li class="rounded-xl border border-border-line bg-surface-base p-4 shadow-xs">
      <div class="flex gap-3">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold tabular-nums text-primary-text">
          {props.index + 1}
        </span>
        <div class="min-w-0 flex-1 space-y-3">
          <p class="whitespace-pre-wrap text-sm leading-6 text-text-strong">{props.question}</p>
          <Show when={open()}>
            <div class="rounded-lg border border-border-hairline bg-surface-tint px-3 py-2.5 text-sm leading-6 text-text-default">
              <p class="whitespace-pre-wrap">{props.answer}</p>
            </div>
          </Show>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" class="h-8 rounded-lg" aria-expanded={open()} onClick={() => setOpen((value) => !value)}>
              {open() ? t("qgen.hideAnswer") : t("qgen.showAnswer")}
            </Button>
            <Button type="button" size="sm" variant="ghost" class="h-8 rounded-lg" onClick={() => void copy()}>
              <Show when={copied()} fallback={<IconCopy class="h-3.5 w-3.5" />}>
                <IconCheck class="h-3.5 w-3.5" />
              </Show>
              {copied() ? t("qgen.copied") : t("qgen.copy")}
            </Button>
            <Show when={props.onAddToBank}>
              <Button type="button" size="sm" variant="ghost" class="ml-auto h-8 rounded-lg" onClick={() => props.onAddToBank?.()}>
                <IconPlus class="h-3.5 w-3.5" />
                {t("qgen.addToBank")}
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </li>
  );
}
