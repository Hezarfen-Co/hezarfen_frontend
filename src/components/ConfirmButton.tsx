// Two-step destructive button: the first press arms it ("Really delete?"),
// the second fires. It disarms by itself after a moment or when focus leaves,
// so a stray tap never destroys anything.

import { Show, createSignal, onCleanup, type JSX } from "solid-js";
import { t } from "../lib/i18n";

export function ConfirmButton(props: {
  children: JSX.Element;
  onConfirm: () => void;
  /** Armed label; defaults to the localized "Really delete?". */
  confirmText?: string;
  /** Resting classes; defaults to "ghost danger". */
  class?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  const disarm = () => {
    clearTimeout(timer);
    setArmed(false);
  };

  const press = () => {
    if (armed()) {
      disarm();
      props.onConfirm();
    } else {
      setArmed(true);
      timer = setTimeout(disarm, 4000);
    }
  };

  return (
    <button
      type="button"
      class={`${props.class ?? "ghost danger"}${armed() ? " confirm-armed" : ""}`}
      disabled={props.disabled}
      onClick={press}
      onBlur={disarm}
    >
      <Show when={armed()} fallback={props.children}>
        {props.confirmText ?? t("reallyDelete")}
      </Show>
    </button>
  );
}
