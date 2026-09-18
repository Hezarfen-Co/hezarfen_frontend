import { For, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  IconArrowRedo,
  IconArrowUndo,
  IconBold,
  IconCodeBlock,
  IconHeading2,
  IconHeading3,
  IconItalic,
  IconLink,
  IconListBullets,
  IconListNumbers,
  IconParagraph,
  IconQuote,
  IconStrikethrough,
  IconUnderline,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { isRichTextEmpty, sanitizeRichText, toRichTextHtml } from "@/lib/rich-text";
import { useT } from "@/stores/preferences-context";

type Block = "p" | "h2" | "h3" | "blockquote" | "pre";
type InlineState = { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean; ul: boolean; ol: boolean; block: Block };

const IDLE: InlineState = { bold: false, italic: false, underline: false, strikeThrough: false, ul: false, ol: false, block: "p" };

/**
 * Document-style note editor: a sticky formatting bar over a contentEditable
 * body that grows with its text (the page scrolls, not a small box). The body
 * is HTML — the format notes are stored in — and every paste and every value
 * loaded from the server is sanitized before it reaches the DOM.
 */
export function NoteRichEditor(props: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Sticky offset for the formatting bar, e.g. below the app header. */
  toolbarClass?: string;
  class?: string;
  /** Right side of the formatting bar — the page's save control lives here. */
  actions?: JSX.Element;
  /** Minimum body height; a full page wants most of the viewport, a side panel less. */
  bodyClass?: string;
}) {
  const t = useT();
  let body: HTMLDivElement | undefined;
  let savedRange: Range | null = null;
  const [state, setState] = createSignal<InlineState>(IDLE);
  const [empty, setEmpty] = createSignal(isRichTextEmpty(props.value));
  const [linkOpen, setLinkOpen] = createSignal(false);
  const [linkInitial, setLinkInitial] = createSignal("https://");
  const [linkText, setLinkText] = createSignal("");

  const emit = () => {
    if (!body) return;
    const blank = isRichTextEmpty(body.innerHTML);
    setEmpty(blank);
    // A first line typed into an empty body is a bare text node. Store it as a
    // paragraph, so the value is recognisably HTML and its entities (`&lt;`)
    // are never mistaken for plain text and escaped twice on the next load.
    const html = body.firstElementChild ? body.innerHTML : `<p>${body.innerHTML}</p>`;
    props.onChange(blank ? "" : html);
  };

  const selectionInside = () => {
    const selection = window.getSelection();
    return !!(body && selection && selection.rangeCount > 0 && body.contains(selection.anchorNode));
  };

  const refreshState = () => {
    if (!selectionInside()) return;
    const block = String(document.queryCommandValue("formatBlock") || "p").toLowerCase().replace(/[<>]/g, "");
    setState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
      block: (["h2", "h3", "blockquote", "pre"].includes(block) ? block : "p") as Block,
    });
  };

  const run = (command: string, value?: string) => {
    body?.focus();
    document.execCommand(command, false, value);
    emit();
    refreshState();
  };

  // Clicking the active block style again returns the line to a paragraph.
  const toggleBlock = (block: Block) => run("formatBlock", `<${state().block === block ? "p" : block}>`);

  onMount(() => {
    if (!body) return;
    body.innerHTML = toRichTextHtml(props.value);
    const onSelection = () => refreshState();
    document.addEventListener("selectionchange", onSelection);
    onCleanup(() => document.removeEventListener("selectionchange", onSelection));
  });

  const openLink = () => {
    const selection = window.getSelection();
    savedRange = selectionInside() && selection ? selection.getRangeAt(0).cloneRange() : null;
    const anchor = selection?.anchorNode?.parentElement?.closest("a");
    setLinkInitial(anchor?.getAttribute("href") ?? "https://");
    setLinkText(savedRange?.toString().trim() || anchor?.textContent?.trim() || "—");
    setLinkOpen(true);
  };

  const applyLink = (raw: string | undefined) => {
    body?.focus();
    const selection = window.getSelection();
    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    const value = raw?.trim() ?? "";
    if (!value || value === "https://") return run("unlink");
    const href = /^(https?:|mailto:)/i.test(value) ? value : `https://${value}`;
    if (selection?.isCollapsed) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = value;
      run("insertHTML", sanitizeRichText(link.outerHTML));
    } else {
      run("createLink", href);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && !event.shiftKey && event.key.toLowerCase() === "k") {
      // Inside the body ⌘K means "link"; stop it before the window-level
      // command palette listener opens on top of the link dialog.
      event.preventDefault();
      event.stopPropagation();
      openLink();
    } else if (event.key === "Tab" && (state().ul || state().ol)) {
      event.preventDefault();
      run(event.shiftKey ? "outdent" : "indent");
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();
    const html = data.getData("text/html");
    if (html) run("insertHTML", sanitizeRichText(html));
    else run("insertText", data.getData("text/plain"));
  };

  type Tool = { label: () => string; icon: (p: { class?: string }) => JSX.Element; active?: () => boolean; onClick: () => void };
  const groups: Tool[][] = [
    [
      { label: () => t("editor.undo"), icon: IconArrowUndo, onClick: () => run("undo") },
      { label: () => t("editor.redo"), icon: IconArrowRedo, onClick: () => run("redo") },
    ],
    [
      { label: () => t("editor.paragraph"), icon: IconParagraph, active: () => state().block === "p" && !state().ul && !state().ol, onClick: () => run("formatBlock", "<p>") },
      { label: () => t("editor.heading2"), icon: IconHeading2, active: () => state().block === "h2", onClick: () => toggleBlock("h2") },
      { label: () => t("editor.heading3"), icon: IconHeading3, active: () => state().block === "h3", onClick: () => toggleBlock("h3") },
    ],
    [
      { label: () => t("editor.bold"), icon: IconBold, active: () => state().bold, onClick: () => run("bold") },
      { label: () => t("editor.italic"), icon: IconItalic, active: () => state().italic, onClick: () => run("italic") },
      { label: () => t("editor.underline"), icon: IconUnderline, active: () => state().underline, onClick: () => run("underline") },
      { label: () => t("editor.strike"), icon: IconStrikethrough, active: () => state().strikeThrough, onClick: () => run("strikeThrough") },
      { label: () => t("editor.link"), icon: IconLink, onClick: openLink },
    ],
    [
      { label: () => t("editor.bulletList"), icon: IconListBullets, active: () => state().ul, onClick: () => run("insertUnorderedList") },
      { label: () => t("editor.numberedList"), icon: IconListNumbers, active: () => state().ol, onClick: () => run("insertOrderedList") },
      { label: () => t("editor.quote"), icon: IconQuote, active: () => state().block === "blockquote", onClick: () => toggleBlock("blockquote") },
      { label: () => t("editor.codeBlock"), icon: IconCodeBlock, active: () => state().block === "pre", onClick: () => toggleBlock("pre") },
    ],
  ];

  return (
    <div class={cn("rounded-xl border border-border bg-card shadow-xs", props.class)}>
      <div class={cn("sticky z-20 flex items-center gap-2 rounded-t-xl border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur", props.toolbarClass)}>
        {/* One row at every width: the tools scroll sideways on a phone so the
            save control on the right never wraps out of reach. */}
        <div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <For each={groups}>
          {(group, index) => (
            <>
              <div class={cn("h-5 w-px shrink-0 bg-border", index() === 0 && "hidden")} />
              <div class="flex items-center gap-0.5">
                <For each={group}>
                  {(tool) => (
                    <button
                      type="button"
                      class={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                        tool.active?.() && "bg-primary/10 text-primary-text hover:bg-primary/15 hover:text-primary-text",
                      )}
                      title={tool.label()}
                      aria-label={tool.label()}
                      aria-pressed={tool.active ? tool.active() : undefined}
                      // Keep the caret in the body: a focused button would drop the selection.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={tool.onClick}
                    >
                      {tool.icon({ class: "h-4 w-4" })}
                    </button>
                  )}
                </For>
              </div>
            </>
          )}
        </For>
        </div>
        <div class="flex shrink-0 items-center gap-2">{props.actions}</div>
      </div>
      <div class="relative px-5 py-5 sm:px-8 sm:py-7">
        <div
          ref={body}
          role="textbox"
          aria-multiline="true"
          aria-label={props.placeholder}
          contentEditable
          class={cn("note-prose outline-hidden", props.bodyClass ?? "min-h-[max(55vh,320px)]")}
          data-empty={empty() ? "true" : "false"}
          data-placeholder={props.placeholder ?? ""}
          onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
          onInput={emit}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onKeyUp={refreshState}
          onMouseUp={refreshState}
        />
      </div>

      <ConfirmDialog
        open={linkOpen()}
        onOpenChange={setLinkOpen}
        title={t("editor.linkTitle")}
        description={t("editor.linkHint")}
        summary={linkText()}
        confirmLabel={t("common.save")}
        icon={<IconLink class="h-4 w-4" />}
        prompt={{ label: t("editor.linkUrl"), initialValue: linkInitial(), singleLine: true, maxLength: 2000 }}
        onConfirm={applyLink}
      />
    </div>
  );
}
