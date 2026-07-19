import { For, Show, createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconSparkles } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export function CelebiPanel(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [draft, setDraft] = createSignal("");
  const [messages, setMessages] = createSignal<Message[]>([]);
  const send = () => {
    const text = draft().trim();
    if (!text) return;
    setMessages((items) => [...items, { role: "user", text }, { role: "assistant", text: t("ai.unavailable") }]);
    setDraft("");
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("ai.title")} description={t("ai.description")}>
      <div class="flex min-h-[calc(100vh-9rem)] flex-col gap-4">
        <Show
          when={messages().length > 0}
          fallback={
            <div class="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              <span class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <IconSparkles class="h-5 w-5" />
              </span>
              {t("ai.empty")}
            </div>
          }
        >
          <div class="flex flex-1 flex-col gap-3">
            <For each={messages()}>
              {(message) => (
                <div class={message.role === "user" ? "ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-8 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"}>
                  {message.text}
                </div>
              )}
            </For>
          </div>
        </Show>
        <form
          class="mt-auto space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <Textarea rows={3} value={draft()} placeholder={t("ai.placeholder")} onInput={(event) => setDraft(event.currentTarget.value)} />
          <div class="flex justify-end">
            <Button type="submit" size="sm" class="rounded-lg" disabled={!draft().trim()}>
              {t("ai.send")}
            </Button>
          </div>
        </form>
      </div>
    </SidePanel>
  );
}
