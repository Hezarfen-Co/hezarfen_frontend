import { For, Show } from "solid-js";

type Segment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; label: string; href: string };

type Block =
  | { kind: "paragraph"; segments: Segment[] }
  | { kind: "code-block"; value: string }
  | { kind: "list"; items: Segment[][] };

const URL_RE = /https?:\/\/[^\s)]+/g;

function parseInline(line: string): Segment[] {
  const segments: Segment[] = [];
  // Order matters: links before bare URLs before bold/code, so `[x](url)` isn't
  // re-split by the bare-URL pass, and `**`/backtick spans aren't cut in half.
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushPlainSpan = (span: string) => {
    // Bare URLs inside a plain span
    let last = 0;
    let urlMatch: RegExpExecArray | null;
    URL_RE.lastIndex = 0;
    while ((urlMatch = URL_RE.exec(span))) {
      if (urlMatch.index > last) pushRich(span.slice(last, urlMatch.index));
      segments.push({ kind: "link", label: urlMatch[0], href: urlMatch[0] });
      last = urlMatch.index + urlMatch[0].length;
    }
    if (last < span.length) pushRich(span.slice(last));
  };

  const pushRich = (span: string) => {
    // Bold and inline code within a span that has no links/bare URLs.
    const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(span))) {
      if (m.index > last) segments.push({ kind: "text", value: span.slice(last, m.index) });
      if (m[1] !== undefined) segments.push({ kind: "bold", value: m[1] });
      else if (m[2] !== undefined) segments.push({ kind: "code", value: m[2] });
      last = m.index + m[0].length;
    }
    if (last < span.length) segments.push({ kind: "text", value: span.slice(last) });
  };

  while ((match = linkRe.exec(line))) {
    if (match.index > cursor) pushPlainSpan(line.slice(cursor, match.index));
    segments.push({ kind: "link", label: match[1], href: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) pushPlainSpan(line.slice(cursor));

  return segments;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ kind: "code-block", value: codeLines.join("\n") });
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: Segment[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(parseInline(lines[i].trim().slice(2)));
        i += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    if (line.trim().length === 0) {
      i += 1;
      continue;
    }

    blocks.push({ kind: "paragraph", segments: parseInline(line) });
    i += 1;
  }

  return blocks;
}

function InlineSegments(props: { segments: Segment[] }) {
  return (
    <For each={props.segments}>
      {(segment) => (
        <Show when={segment.kind !== "text"} fallback={<>{(segment as { value: string }).value}</>}>
          <Show when={segment.kind === "bold"}>
            <strong>{(segment as { value: string }).value}</strong>
          </Show>
          <Show when={segment.kind === "code"}>
            <code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{(segment as { value: string }).value}</code>
          </Show>
          <Show when={segment.kind === "link"}>
            <a
              href={(segment as { href: string }).href}
              target="_blank"
              rel="noreferrer"
              class="underline underline-offset-2 hover:text-primary-text"
            >
              {(segment as { label: string }).label}
            </a>
          </Show>
        </Show>
      )}
    </For>
  );
}

export function CelebiMarkdown(props: { text: string }) {
  const blocks = () => parseBlocks(props.text);
  return (
    <div class="space-y-2">
      <For each={blocks()}>
        {(block) => (
          <Show when={block.kind === "paragraph"} fallback={
            <Show when={block.kind === "code-block"} fallback={
              <ul class="list-disc space-y-1 pl-5">
                <For each={(block as { items: Segment[][] }).items}>
                  {(item) => <li><InlineSegments segments={item} /></li>}
                </For>
              </ul>
            }>
              <pre class="overflow-x-auto rounded-lg bg-muted p-2.5 text-xs">
                <code>{(block as { value: string }).value}</code>
              </pre>
            </Show>
          }>
            <p class="whitespace-pre-wrap leading-6">
              <InlineSegments segments={(block as { segments: Segment[] }).segments} />
            </p>
          </Show>
        )}
      </For>
    </div>
  );
}
