import { createSignal, createEffect } from "solid-js";
import { cn } from "@/lib/cn";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  class?: string;
  minHeight?: string;
}

export function RichTextEditor(props: RichTextEditorProps) {
  let editorRef: HTMLDivElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);

  // Sync value from props into editor when changed externally
  createEffect(() => {
    if (editorRef && editorRef.innerHTML !== props.value) {
      // If props value is empty string, clear innerHTML
      if (!props.value) {
        editorRef.innerHTML = "";
      } else if (editorRef.innerHTML !== props.value) {
        editorRef.innerHTML = props.value;
      }
    }
  });

  const handleInput = () => {
    if (editorRef) {
      const html = editorRef.innerHTML;
      // If editor contains empty tags like <br> or <p><br></p>, treat as empty
      if (html === "<br>" || html === "<p><br></p>" || editorRef.innerText.trim() === "") {
        props.onChange("");
      } else {
        props.onChange(html);
      }
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef) return;
    editorRef.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  return (
    <div
      class={cn(
        "flex flex-col rounded-xl border border-border/80 bg-background overflow-hidden transition-all",
        isFocused() && "ring-1 ring-primary border-primary/60",
        props.class
      )}
    >
      {/* Gmail Style Rich Formatting Toolbar */}
      <div class="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5 text-xs select-none">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded font-bold text-xs hover:bg-muted text-foreground"
          onClick={() => execCommand("bold")}
          title="Kalın (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded italic text-xs hover:bg-muted text-foreground"
          onClick={() => execCommand("italic")}
          title="İtalik (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded underline text-xs hover:bg-muted text-foreground"
          onClick={() => execCommand("underline")}
          title="Altı Çizili (Ctrl+U)"
        >
          U
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded line-through text-xs hover:bg-muted text-foreground"
          onClick={() => execCommand("strikeThrough")}
          title="Üstü Çizili"
        >
          S
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          class="flex h-7 px-2 items-center justify-center rounded text-xs font-mono hover:bg-muted text-foreground"
          onClick={() => execCommand("insertUnorderedList")}
          title="Madde İşaretli Liste"
        >
          • Liste
        </button>
        <button
          type="button"
          class="flex h-7 px-2 items-center justify-center rounded text-xs font-mono hover:bg-muted text-foreground"
          onClick={() => execCommand("insertOrderedList")}
          title="Numaralı Liste"
        >
          1. Liste
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          class="flex h-7 px-2 items-center justify-center rounded text-xs hover:bg-muted text-muted-foreground"
          onClick={() => execCommand("removeFormat")}
          title="Biçimlendirmeyi Temizle"
        >
          Biçimi Temizle
        </button>
      </div>

      {/* Contenteditable Editor Area */}
      <div class="relative flex-1 p-3 min-h-0">
        <div
          ref={editorRef}
          contentEditable
          class={cn(
            "w-full h-full min-h-[140px] outline-hidden text-xs leading-relaxed text-foreground whitespace-pre-wrap overflow-auto",
            props.minHeight ? props.minHeight : "min-h-[140px]"
          )}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {/* Placeholder overlay */}
        {!props.value && !isFocused() && (
          <div class="pointer-events-none absolute left-3 top-3 text-xs text-muted-foreground/60 select-none">
            {props.placeholder || "Mesajınızı buraya yazın..."}
          </div>
        )}
      </div>
    </div>
  );
}
