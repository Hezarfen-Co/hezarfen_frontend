import type { ParentProps } from "solid-js";
import { LogoMark } from "@/components/brand/logo-mark";

export function AuthPageShell(props: ParentProps<{ title: string; subtitle: string }>) {
  return (
    <div class="-mx-4 -my-6 flex min-h-[calc(var(--app-viewport)-3.5rem)] items-start justify-center px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div class="w-full max-w-[480px] rounded-xl border border-border-line bg-surface-base px-6 pb-8 pt-9 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)] sm:px-10">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 flex h-12 w-12 items-center justify-center text-text-strong">
            <LogoMark size={44} />
          </div>
          <h1 class="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-text-strong">
            {props.title}
          </h1>
          <p class="mt-2 text-sm leading-[21px] text-text-subtle">{props.subtitle}</p>
        </div>

        {props.children}
      </div>
    </div>
  );
}
