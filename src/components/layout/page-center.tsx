import { createSignal, type JSX } from "solid-js";
import { currentLocale } from "@/api/client";
import { formatMessage, loadLocale, messageFor, type MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";

/** Card sizing shared by the full-page states (load failure, record not found). */
export const PAGE_STATE_CARD = "min-h-[420px] gap-6 px-6 py-10 sm:px-10 sm:py-12";

/**
 * Text for the full-page states. They can render from the router's error
 * component, above the i18n provider, so they read the loaded dictionary
 * directly instead of `useT()` (the boot awaits the stored locale first).
 */
// Bumped when a dictionary that was missing has loaded, so text read through
// pageStateText redraws in place.
const [dictionaryVersion, setDictionaryVersion] = createSignal(0);

export function pageStateText(key: MessageKey, vars?: Record<string, string | number>): string {
  dictionaryVersion();
  const locale = currentLocale();
  const message = messageFor(locale, key);
  if (message == null) {
    // The dictionary can be gone when this screen shows: a hot reload that
    // dropped the i18n module, or a crash before the boot finished. Fetch it
    // and redraw instead of leaving raw keys on screen; until it lands the
    // screen shows nothing rather than "errors.pageLoad.title".
    void loadLocale(locale).then(() => setDictionaryVersion((n) => n + 1), () => undefined);
    return "";
  }
  return formatMessage(message, vars);
}

/**
 * Fills the content column under the shell header and centers a full-page
 * state on both axes, capped at a comfortable reading width.
 */
export function PageCenter(props: { children: JSX.Element; alert?: boolean; class?: string }) {
  return (
    // Below lg: no header, but the shell's page title, 1.5rem top padding and
    // the tab bar + quick-action clearance (up to 9rem) at the bottom.
    // lg+: the 49px header plus the column's py-6.
    <div class="flex min-h-[calc(100dvh-13rem)] w-full items-center justify-center lg:min-h-[calc(100dvh-49px-3rem)]">
      <div role={props.alert ? "alert" : undefined} class={cn("w-full max-w-[600px]", props.class)}>
        {props.children}
      </div>
    </div>
  );
}
