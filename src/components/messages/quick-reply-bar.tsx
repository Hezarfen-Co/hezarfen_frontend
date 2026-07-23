import { createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconSend } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

interface QuickReplyBarProps {
  recipientName: string;
  defaultSubject: string;
  onSend: (body: string, subject: string) => Promise<void>;
  disabled?: boolean;
}

export function QuickReplyBar(props: QuickReplyBarProps) {
  const t = useT();
  const [body, setBody] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleSend = async (e?: Event) => {
    if (e) e.preventDefault();
    const content = body().trim();
    if (!content || sending() || props.disabled) return;

    setError("");
    setSending(true);

    try {
      const replySubject = props.defaultSubject.startsWith("Re:")
        ? props.defaultSubject
        : `Re: ${props.defaultSubject}`;

      await props.onSend(content, replySubject);
      setBody("");
    } catch (err: any) {
      setError(err?.message || "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div class="border-t bg-card/80 p-3 backdrop-blur-xs">
      <form onSubmit={handleSend} class="space-y-2">
        <Show when={error()}>
          <p class="text-xs font-medium text-destructive px-1">{error()}</p>
        </Show>
        <div class="flex items-end gap-2">
          <div class="relative flex-1">
            <Textarea
              value={body()}
              onInput={(e) => setBody(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${props.recipientName} kişisine mesaj yanıtla... (Göndermek için Enter, yeni satır için Shift+Enter)`}
              rows={2}
              class="min-h-[2.5rem] max-h-32 resize-none rounded-xl bg-background text-sm py-2 px-3 focus-visible:ring-1"
              disabled={sending() || props.disabled}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            class="h-10 w-10 shrink-0 rounded-xl p-0"
            disabled={!body().trim() || sending() || props.disabled}
            title={t("messages.send")}
          >
            <IconSend class="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
