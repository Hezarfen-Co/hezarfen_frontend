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
      <div class="pointer-events-none fixed inset-x-3 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:w-96">
        <For each={toasts()}>
          {(toast) => (
            <div class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 text-card-foreground shadow-soft">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <IconCheck class="h-3.5 w-3.5" />
              </span>
              <p class="min-w-0 flex-1 text-sm font-medium leading-5">{toast.title}</p>
              <button
                type="button"
                class={cn("rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground")}
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
