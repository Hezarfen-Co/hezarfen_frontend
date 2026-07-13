import { createSignal, onCleanup } from "solid-js";
import { getTime } from "@/api/getTime";

export function createNow(intervalMs = 1000) {
  let offset = 0;
  const serverNow = () => Date.now() + offset;
  const [now, setNow] = createSignal(serverNow());

  void getTime()
    .then((data) => {
      offset = data.now - Date.now();
      setNow(serverNow());
    })
    .catch(() => {
      offset = 0;
    });

  const interval = setInterval(() => setNow(serverNow()), intervalMs);
  onCleanup(() => clearInterval(interval));
  return now;
}
