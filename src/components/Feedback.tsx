// Small shared feedback pieces: inline error line, loading pulse, empty state.

import { Show, type JSX } from "solid-js";

export function ErrorLine(props: { error: string | null }) {
  return (
    <Show when={props.error}>
      <p class="error" role="alert">
        {props.error}
      </p>
    </Show>
  );
}

export function Loading() {
  return (
    <div class="loading" aria-label="loading">
      <span /><span /><span />
    </div>
  );
}

export function Empty(props: { children: JSX.Element; action?: JSX.Element }) {
  return (
    <div class="empty">
      <p>{props.children}</p>
      {props.action}
    </div>
  );
}
