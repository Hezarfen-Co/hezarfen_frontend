import { createSignal, type Accessor } from "solid-js";
import { showToast } from "@/components/ui/toast";

/** Short-lived success feedback; page banners stay empty, global toast renders it. */
export function createFlash(_ms = 3000): [Accessor<string>, (text: string) => void] {
  const [message, setMessage] = createSignal("");
  return [message, (text) => {
    setMessage("");
    showToast({ title: text });
  }];
}
