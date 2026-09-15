import type { ParentProps } from "solid-js";
import { LogoMark } from "@/components/brand/logo-mark";

export function AuthPageShell(props: ParentProps<{ title: string; subtitle: string }>) {
  return (
    <div class="relative isolate -mx-4 -my-6 grid min-h-[calc(var(--app-viewport)-3.5rem)] place-items-center overflow-hidden px-4 py-10 sm:-mx-6 sm:px-6 sm:py-14 lg:-mx-10 lg:px-10">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute left-1/2 top-[-15rem] h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div class="absolute bottom-[-13rem] right-[-10rem] h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div class="relative w-full max-w-[480px]">
        <div aria-hidden="true" class="absolute -inset-px rounded-xl bg-gradient-to-b from-primary/25 via-border-line to-border-line" />
        <div class="relative overflow-hidden rounded-xl border border-border-line/70 bg-surface-base px-6 pb-8 pt-8 shadow-[0_28px_80px_-42px_rgba(0,0,0,0.65)] sm:px-10 sm:pb-9 sm:pt-9">
          <div aria-hidden="true" class="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

          <div class="mb-8 text-center">
            <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-text-strong shadow-sm">
              <LogoMark size={38} />
            </div>
            <h1 class="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-text-strong">
              {props.title}
            </h1>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-[21px] text-text-subtle">
              {props.subtitle}
            </p>
          </div>

          {props.children}
        </div>
      </div>
    </div>
  );
}
