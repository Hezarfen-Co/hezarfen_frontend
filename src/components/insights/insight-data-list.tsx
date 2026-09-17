import { For, Show } from "solid-js";

type DataEntry = { path: string; value: string };

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("tr-TR"));
}

function scalar(value: unknown): string | null {
  if (value == null) return "—";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

function flatten(value: unknown, path = "", depth = 0): DataEntry[] {
  const direct = scalar(value);
  if (direct != null) return [{ path: path || "Değer", value: direct }];
  if (depth >= 3) return [{ path: path || "Değer", value: JSON.stringify(value) }];

  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    return value.flatMap((item, index) => flatten(item, `${path}${path ? " " : ""}${index + 1}`, depth + 1));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      flatten(item, path ? `${path} · ${humanize(key)}` : humanize(key), depth + 1),
    );
  }

  return [];
}

export function InsightDataList(props: { value: unknown; emptyLabel: string }) {
  const entries = () => flatten(props.value);

  return (
    <Show
      when={entries().length > 0}
      fallback={<p class="text-xs text-muted-foreground">{props.emptyLabel}</p>}
    >
      <dl class="divide-y divide-border-hairline overflow-hidden rounded-lg border border-border-hairline bg-surface-overlay">
        <For each={entries()}>
          {(entry) => (
            <div class="grid grid-cols-[minmax(0,1fr)_minmax(5rem,auto)] gap-3 px-3 py-2 text-xs">
              <dt class="min-w-0 break-words text-muted-foreground">{entry.path}</dt>
              <dd class="max-w-52 break-words text-right font-medium text-foreground">{entry.value}</dd>
            </div>
          )}
        </For>
      </dl>
    </Show>
  );
}
