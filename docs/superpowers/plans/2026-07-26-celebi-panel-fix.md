# Çelebi Panel Layout Fix + UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the double-scroll/drifting-composer layout bug in the Çelebi assistant panel and add markdown rendering, a copy action, and a richer pending state — all within the existing 3-endpoint chatbot API (no session list/history/stop/regenerate, since the backend doesn't support them).

**Architecture:** `CelebiPanel` (`src/components/layout/celebi-panel.tsx`) is a single mounted-once component driven by local Solid signals; `SidePanel` (`src/components/ui/side-panel.tsx`) already owns the one scroll region for its body. The fix removes `CelebiPanel`'s second scroll container and lets its composer stick to the bottom of that single region instead of living in its own nested flex column. A new pure-function markdown-lite parser renders assistant message text into Solid JSX; a new `IconCopy` follows the existing icon pattern; two new i18n keys drive a rotating "thinking" label.

**Tech Stack:** SolidJS, TypeScript, Tailwind, Vitest + @solidjs/testing-library (existing repo stack — no new dependencies).

## Global Constraints

- No new runtime dependencies (repo already excludes markdown libs, lodash, date libs) — markdown rendering must be hand-rolled.
- One component per file; file name kebab-case, exported component PascalCase.
- Never destructure Solid `props`; use `props.x` or `splitProps`.
- Use `class`, not `className`.
- Both locales (`en`, `tr`) must be updated together in `src/i18n/messages.ts` for any new copy, including the `MessageKey` union.
- `bun run build` (`tsc --noEmit && vite build`) must pass before any commit (commit-workflow gate — do not run `git commit` without explicit user approval each time).
- Existing icon geometry: `viewBox="0 0 24 24"`, `stroke-width="2"`, round caps/joins, wrapped in the shared `<Svg>` helper in `src/components/ui/icons.tsx`.

---

### Task 1: Fix nested-scroll layout in `CelebiPanel`

**Files:**
- Modify: `src/components/layout/celebi-panel.tsx:98-141`

**Interfaces:**
- Consumes: existing `messages()`, `draft()`, `sending()`, `send()`, `t()`, `locale()` — no signature changes.
- Produces: no new exports; DOM structure changes only (relevant to Task 3/4, which touch the same JSX region).

- [ ] **Step 1: Read current render output structure to confirm anchor points**

Re-read `src/components/layout/celebi-panel.tsx:98-141` (already read this session — structure is: `SidePanel > div.min-h-[calc(100vh-9rem)].flex-col.gap-4 > Show(messages) > div.flex-1.overflow-y-auto > For(...)` then a sibling `form.mt-auto`).

- [ ] **Step 2: Replace the outer wrapper and message list, make composer sticky**

Replace the full `return (...)` block (lines 98-141) with:

```tsx
  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("ai.title")} description={t("ai.description")}>
      <div class="flex flex-col gap-4">
        <Show
          when={messages().length > 0}
          fallback={
            <div class="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-9 text-center text-sm text-muted-foreground">
              <div class="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <span class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <IconSparkles class="h-5 w-5" />
              </span>
              {t("ai.empty")}
            </div>
          }
        >
          <div class="flex flex-col gap-3">
            <For each={messages()}>
              {(message) => (
                <div class={message.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground" : "mr-6 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm"}>
                  <Show when={message.role === "assistant" && message.status === "pending"} fallback={<p class="whitespace-pre-wrap leading-6">{message.status === "failed" && !message.content ? failureMessage(message.error_code) : message.content}</p>}>
                    <span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse">•••</span></span>
                  </Show>
                  <Show when={message.role === "assistant" && message.status === "failed"}>
                    <span class="mt-2 flex items-center gap-1.5 text-xs text-destructive"><IconAlert class="h-3.5 w-3.5" />{failureMessage(message.error_code)}</span>
                  </Show>
                  <Show when={message.role === "assistant" && message.truncated}>
                    <p class="mt-2 text-xs text-muted-foreground">{locale() === "tr" ? "Yanıt uzunluk sınırında kısaltıldı." : "Response was shortened at the configured limit."}</p>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
        <form class="sticky bottom-0 rounded-2xl border border-border bg-card p-2 shadow-sm" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <Textarea rows={3} class="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" value={draft()} placeholder={t("ai.placeholder")} onInput={(event) => setDraft(event.currentTarget.value)} />
          <div class="flex items-center justify-between px-1 pt-2">
            <span class="text-xs text-muted-foreground">{locale() === "tr" ? "Çelebi yanıtları yapay zekâ tarafından üretilir." : "Çelebi responses are AI-generated."}</span>
            <Button type="submit" size="sm" class="rounded-xl" disabled={!draft().trim() || sending()}>
              <IconSend class="mr-1.5 h-4 w-4" />{t("ai.send")}
            </Button>
          </div>
        </form>
      </div>
    </SidePanel>
  );
}
```

Note what changed vs. the original: removed `min-h-[calc(100vh-9rem)]` and `overflow-y-auto pr-1` from the two wrapper divs (the panel body in `side-panel.tsx:69` is now the only scroll container), and `form` goes from `mt-auto` to `sticky bottom-0` so it stays pinned to the bottom of that single scroll region instead of relying on flex layout inside a now-non-scrolling column.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: no TypeScript errors, Vite build succeeds.

- [ ] **Step 4: Manual check in dev server**

Run: `bun run dev`, log in, open Çelebi panel (bot icon in header), send a couple of messages to get a long thread, confirm: one scrollbar only, composer stays visible at the bottom while scrolling, empty state unaffected, no dead space with a short (1-message) thread.

- [ ] **Step 5: Commit**

Ask user for explicit approval per commit-workflow, then:

```bash
git add src/components/layout/celebi-panel.tsx
git commit -m "fix: 📐 collapse Çelebi panel's nested scroll region"
```

---

### Task 2: Add `IconCopy`

**Files:**
- Modify: `src/components/ui/icons.tsx` (append new export near `IconCheck`, e.g. after line 107)

**Interfaces:**
- Produces: `IconCopy(props: IconProps): JSX.Element`, matching the existing `IconProps = { class?: string }` signature used by every other icon in this file.

- [ ] **Step 1: Add the icon**

Insert after the `IconCheck` export (`src/components/ui/icons.tsx:101-107`):

```tsx
export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

Ask user for explicit approval, then:

```bash
git add src/components/ui/icons.tsx
git commit -m "feat: ✨ add IconCopy"
```

---

### Task 3: Markdown-lite renderer for assistant messages

**Files:**
- Create: `src/components/layout/celebi-markdown.tsx`
- Test: `src/components/layout/celebi-markdown.test.tsx`
- Modify: `src/components/layout/celebi-panel.tsx` (use the renderer in the assistant bubble's `<p>` in the block from Task 1)

**Interfaces:**
- Produces: `CelebiMarkdown(props: { text: string }): JSX.Element` — a Solid component. Renders `props.text` as: fenced code blocks (` ```code``` `, no language-based highlighting) as `<pre><code>`, inline code (`` `x` ``) as `<code>`, bold (`**x**`) as `<strong>`, bullet lists (lines starting `- `) as `<ul><li>`, `[text](url)` and bare `http(s)://…` as `<a target="_blank" rel="noreferrer">`. Everything else is plain text nodes (Solid auto-escapes — no `innerHTML` anywhere).
- Consumes: nothing beyond its own prop.

- [ ] **Step 1: Write the failing tests**

Create `src/components/layout/celebi-markdown.test.tsx`:

```tsx
import { render } from "@solidjs/testing-library";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";

test("renders bold text", () => {
  const { container } = render(() => <CelebiMarkdown text="a **bold** word" />);
  expect(container.querySelector("strong")?.textContent).toBe("bold");
});

test("renders inline code", () => {
  const { container } = render(() => <CelebiMarkdown text="run `npm test` now" />);
  expect(container.querySelector("code")?.textContent).toBe("npm test");
});

test("renders a fenced code block without the language line as code", () => {
  const { container } = render(() => <CelebiMarkdown text={"```\nconst x = 1;\n```"} />);
  expect(container.querySelector("pre code")?.textContent).toBe("const x = 1;");
});

test("renders a bullet list", () => {
  const { container } = render(() => <CelebiMarkdown text={"- first\n- second"} />);
  const items = Array.from(container.querySelectorAll("li")).map((el) => el.textContent);
  expect(items).toEqual(["first", "second"]);
});

test("renders a markdown link with target=_blank", () => {
  const { container } = render(() => <CelebiMarkdown text="see [docs](https://example.com/x)" />);
  const link = container.querySelector("a");
  expect(link?.getAttribute("href")).toBe("https://example.com/x");
  expect(link?.getAttribute("target")).toBe("_blank");
});

test("auto-links a bare URL", () => {
  const { container } = render(() => <CelebiMarkdown text="visit https://example.com/y please" />);
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/y");
});

test("plain text with no markdown renders unchanged", () => {
  const { container } = render(() => <CelebiMarkdown text="just plain text" />);
  expect(container.textContent).toBe("just plain text");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/components/layout/celebi-markdown.test.tsx`
Expected: FAIL — `Cannot find module '@/components/layout/celebi-markdown'`.

- [ ] **Step 3: Implement the parser**

Create `src/components/layout/celebi-markdown.tsx`:

```tsx
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
              class="underline underline-offset-2 hover:text-primary"
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/components/layout/celebi-markdown.test.tsx`
Expected: all 7 tests PASS.

- [ ] **Step 5: Wire into the assistant bubble**

In `src/components/layout/celebi-panel.tsx`, add the import:

```tsx
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
```

Replace the assistant success-path line (inside the `Show ... fallback={...}` from Task 1's Step 2):

```tsx
<p class="whitespace-pre-wrap leading-6">{message.status === "failed" && !message.content ? failureMessage(message.error_code) : message.content}</p>
```

with:

```tsx
<Show when={message.status === "failed" && !message.content} fallback={<CelebiMarkdown text={message.content} />}>
  <p class="whitespace-pre-wrap leading-6">{failureMessage(message.error_code)}</p>
</Show>
```

User bubbles keep the original plain `<p>` — only the assistant branch changes.

- [ ] **Step 6: Verify build**

Run: `bun run build`
Expected: no TypeScript errors.

- [ ] **Step 7: Manual check**

`bun run dev`, send a message, confirm existing plain-text replies still render correctly (parser must be a no-op on plain prose — covered by the "plain text with no markdown renders unchanged" test, but eyeball a real reply too).

- [ ] **Step 8: Commit**

Ask user for explicit approval, then:

```bash
git add src/components/layout/celebi-markdown.tsx src/components/layout/celebi-markdown.test.tsx src/components/layout/celebi-panel.tsx
git commit -m "feat: 📝 render Çelebi replies as markdown-lite"
```

---

### Task 4: Copy button on assistant messages

**Files:**
- Modify: `src/components/layout/celebi-panel.tsx`

**Interfaces:**
- Consumes: `IconCopy` from Task 2, existing per-message loop in the `For each={messages()}` block from Task 1.
- Produces: no new exports.

- [ ] **Step 1: Add copy-state signal and handler**

Near the other signals at the top of `CelebiPanel` (after `const [sending, setSending] = createSignal(false);`), add:

```tsx
  const [copiedId, setCopiedId] = createSignal<string>();

  const copyMessage = async (message: PanelMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId((current) => (current === message.id ? undefined : current)), 1_500);
  };
```

Add `IconCopy` to the existing icons import line:

```tsx
import { IconAlert, IconBotSquare, IconCopy, IconSend, IconSparkles } from "@/components/ui/icons";
```

- [ ] **Step 2: Render the button in the assistant bubble**

Inside the `For each={messages()}` bubble `div` (from Task 1/3), after the truncated-notice `<Show>` block, add a button shown only for completed assistant messages:

```tsx
<Show when={message.role === "assistant" && message.status === "complete"}>
  <button
    type="button"
    class="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    onClick={() => void copyMessage(message)}
  >
    <IconCopy class="h-3 w-3" />
    {copiedId() === message.id ? t("ai.copied") : t("ai.copy")}
  </button>
</Show>
```

- [ ] **Step 3: Add the two new i18n keys**

In `src/i18n/messages.ts`, add to the `MessageKey` union (after `"ai.unavailable"` at line 12):

```ts
  | "ai.copy"
  | "ai.copied"
```

Add to the `en` dict (after `"ai.unavailable"` at line 953):

```ts
  "ai.copy": "Copy",
  "ai.copied": "Copied",
```

Add to the `tr` dict (after `"ai.unavailable"` at line 1906):

```ts
  "ai.copy": "Kopyala",
  "ai.copied": "Kopyalandı",
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: no TypeScript errors (missing `MessageKey` entries fail the build, so this also confirms Step 3 was done in both dicts).

- [ ] **Step 5: Manual check**

`bun run dev`, send a message, wait for the reply to complete, click "Copy", confirm the label flips to "Copied" for ~1.5s then reverts, and the clipboard actually holds the reply text (paste it somewhere).

- [ ] **Step 6: Commit**

Ask user for explicit approval, then:

```bash
git add src/components/layout/celebi-panel.tsx src/i18n/messages.ts
git commit -m "feat: 📋 add copy action to Çelebi replies"
```

---

### Task 5: Rotating "thinking" status on the pending bubble

**Files:**
- Create: `src/components/layout/celebi-thinking-label.tsx`
- Test: `src/components/layout/celebi-thinking-label.test.tsx`
- Modify: `src/components/layout/celebi-panel.tsx`

**Interfaces:**
- Produces: `CelebiThinkingLabel(): JSX.Element` — self-contained Solid component with its own timer (starts on mount via `createSignal` + `setInterval`, cleans up via `onCleanup`), cycling through localized strings from the `t()` helper (`useT()`).
- Consumes: `useT` from `@/stores/preferences-context` (same as `CelebiPanel`).

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/celebi-thinking-label.test.tsx`:

```tsx
import { render, screen } from "@solidjs/testing-library";
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
import { PreferencesProvider } from "@/stores/preferences-context";

test("shows the first thinking phrase immediately", () => {
  render(() => (
    <PreferencesProvider>
      <CelebiThinkingLabel />
    </PreferencesProvider>
  ));
  expect(screen.getByText("Çelebi is thinking…")).toBeInTheDocument();
});

test("rotates to the next phrase after the interval", () => {
  vi.useFakeTimers();
  render(() => (
    <PreferencesProvider>
      <CelebiThinkingLabel />
    </PreferencesProvider>
  ));
  vi.advanceTimersByTime(1_800);
  expect(screen.getByText("Looking into it…")).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/components/layout/celebi-thinking-label.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add i18n keys for the phrases**

In `src/i18n/messages.ts`, add to `MessageKey` (after the `ai.copied` entry added in Task 4):

```ts
  | "ai.thinking1"
  | "ai.thinking2"
  | "ai.thinking3"
```

Add to `en`:

```ts
  "ai.thinking1": "Çelebi is thinking…",
  "ai.thinking2": "Looking into it…",
  "ai.thinking3": "Almost there…",
```

Add to `tr`:

```ts
  "ai.thinking1": "Çelebi düşünüyor…",
  "ai.thinking2": "Araştırıyor…",
  "ai.thinking3": "Neredeyse hazır…",
```

- [ ] **Step 4: Implement the component**

Create `src/components/layout/celebi-thinking-label.tsx`:

```tsx
import { createSignal, onCleanup } from "solid-js";
import { useT } from "@/stores/preferences-context";

const ROTATE_MS = 1_800;
const KEYS = ["ai.thinking1", "ai.thinking2", "ai.thinking3"] as const;

export function CelebiThinkingLabel() {
  const t = useT();
  const [index, setIndex] = createSignal(0);
  const timer = window.setInterval(() => setIndex((i) => (i + 1) % KEYS.length), ROTATE_MS);
  onCleanup(() => window.clearInterval(timer));
  return <>{t(KEYS[index()])}</>;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/components/layout/celebi-thinking-label.test.tsx`
Expected: both tests PASS.

- [ ] **Step 6: Wire into the pending bubble**

In `src/components/layout/celebi-panel.tsx`, add the import:

```tsx
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
```

Replace the pending-state span (from Task 1's Step 2):

```tsx
<span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse">•••</span></span>
```

with:

```tsx
<span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse"><CelebiThinkingLabel /></span></span>
```

- [ ] **Step 7: Verify build**

Run: `bun run build`
Expected: no TypeScript errors.

- [ ] **Step 8: Manual check**

`bun run dev`, send a message, watch the pending bubble cycle through the three phrases while waiting for the reply.

- [ ] **Step 9: Commit**

Ask user for explicit approval, then:

```bash
git add src/components/layout/celebi-thinking-label.tsx src/components/layout/celebi-thinking-label.test.tsx src/components/layout/celebi-panel.tsx src/i18n/messages.ts
git commit -m "feat: 💬 rotate Çelebi's pending status label"
```

---

## Final Verification

- [ ] **Full build + test pass**

Run: `bun run build && bun test`
Expected: build succeeds, all tests (including the 4 new files) pass.

- [ ] **Full manual walkthrough**

`bun run dev`: open Çelebi panel, verify empty state, send a message with a markdown-ish reply (bold/code/list/link if the backend echoes any), confirm single scrollbar + pinned composer, copy a reply, watch the pending label rotate, switch locale to `tr` and repeat the copy/pending checks.
