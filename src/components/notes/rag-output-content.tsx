import { For, Show } from "solid-js";
import { payloadPoints, payloadText } from "@/components/notes/rag-output-document";

/** Render the useful parts of the AI service's open payload without exposing a JSON dump first. */
export function RagOutputContent(props: { payload: unknown }) {
  const summary = () => payloadText(props.payload);
  const points = () => payloadPoints(props.payload);

  return (
    <div class="space-y-3 text-sm leading-6">
      <Show when={summary()}>
        {(text) => <p class="whitespace-pre-wrap text-foreground">{text()}</p>}
      </Show>
      <Show when={points().length > 0}>
        <ul class="list-disc space-y-1 pl-5 text-foreground/85">
          <For each={points()}>{(point) => <li>{point}</li>}</For>
        </ul>
      </Show>
      <Show when={!summary() && points().length === 0}>
        <pre class="overflow-x-auto whitespace-pre-wrap text-xs leading-5">{JSON.stringify(props.payload, null, 2)}</pre>
      </Show>
    </div>
  );
}
