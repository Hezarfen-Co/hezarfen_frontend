import { For, Show } from "solid-js";

const SUMMARY_KEYS = ["summary", "ozet", "özet", "content", "text", "answer"];
const LIST_KEYS = ["keywords", "key_points", "topics", "questions", "highlights"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstText(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  for (const key of SUMMARY_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstList(record: Record<string, unknown> | null): string[] {
  if (!record) return [];
  for (const key of LIST_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) {
      const rows = value.filter((item): item is string => typeof item === "string" && !!item.trim());
      if (rows.length > 0) return rows;
    }
  }
  return [];
}

/** Render the useful parts of the AI service's open payload without exposing a JSON dump first. */
export function RagOutputContent(props: { payload: unknown }) {
  const record = () => asRecord(props.payload);
  const summary = () => typeof props.payload === "string" ? props.payload : firstText(record());
  const points = () => firstList(record());

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
