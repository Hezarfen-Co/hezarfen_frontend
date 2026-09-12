import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconWifiOff } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

/**
 * Reflects the browser's own online/offline signal — nothing invented, no
 * queued-write promise the app can't keep. Sits above the routed content so
 * a lost connection is visible everywhere, not just on the page that
 * happened to trigger a fetch.
 */
export function NetworkStatusBanner() {
  const t = useT();
  const [online, setOnline] = createSignal(true);

  onMount(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    onCleanup(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
  });

  return (
    <Show when={!online()}>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm sm:px-6 lg:px-4">
        <span class="flex min-w-0 items-center gap-2 text-text-strong">
          <IconWifiOff class="h-4 w-4 shrink-0 text-warning" />
          <span class="min-w-0">
            <span class="font-semibold">{t("network.offlineTitle")}</span>
            <span class="hidden text-text-subtle sm:inline"> — {t("network.offlineDescription")}</span>
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          class="h-[26px] shrink-0 rounded-lg"
          onClick={() => setOnline(navigator.onLine)}
        >
          {t("network.reconnect")}
        </Button>
      </div>
    </Show>
  );
}
