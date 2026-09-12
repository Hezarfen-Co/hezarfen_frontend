import { For, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { IconCheck, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Toast = {
  id: number;
  title: string;
};

const [toasts, setToasts] = createSignal<Toast[]>([]);
let nextId = 1;

export function showToast(props: { title: string }) {
  const id = nextId++;
  setToasts((items) => [...items, { id, title: props.title }].slice(-4));
  window.setTimeout(() => dismissToast(id), 3000);
}

function dismissToast(id: number) {
  setToasts((items) => items.filter((item) => item.id !== id));
}

export function Toaster() {
  return (
    <Portal>
      <div class="pointer-events-none fixed inset-x-3 top-4 z-80 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:w-[380px]">
        <For each={toasts()}>
          {(toast) => (
            <div class="pointer-events-auto flex min-h-[65px] w-full items-center gap-3 rounded-lg border border-border-line bg-surface-base px-4 py-3 text-foreground shadow-xl shadow-black/10">
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <IconCheck class="h-3.5 w-3.5" />
              </span>
              <p class="min-w-0 flex-1 text-xs font-medium leading-relaxed">{toast.title}</p>
              <button
                type="button"
                class={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring")}
                aria-label="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                <IconX class="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
