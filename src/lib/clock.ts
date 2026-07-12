// Server-authoritative time. Every deadline in the API is judged by the
// backend clock, so countdowns and "is the window open?" checks must not
// trust the device clock: sync once, keep the offset, add it to Date.now().

import { createSignal } from "solid-js";
import { meta } from "./api";

const [offset, setOffset] = createSignal(0);
let syncing: Promise<void> | undefined;

/** Fetch `/time` once and remember `server - device`. Safe to call again. */
export function syncClock(): Promise<void> {
  syncing ??= (async () => {
    try {
      const before = Date.now();
      const { now } = await meta.time();
      // Split the round trip: the server read sits roughly mid-flight.
      setOffset(now - (before + Date.now()) / 2);
    } catch {
      // Offline or backend down — fall back to the device clock (offset 0);
      // the server still enforces every deadline itself. Allow a retry.
      syncing = undefined;
    }
  })();
  return syncing;
}

/** Best estimate of the server clock, UTC unix-milliseconds. Reactive. */
export function serverNow(): number {
  if (syncing === undefined) void syncClock();
  return Date.now() + offset();
}

/**
 * A signal ticking with the (offset-corrected) server clock — for countdowns
 * and open/closed window checks that should re-render as time passes.
 */
export function createClock(intervalMs = 1000) {
  const [now, setNow] = createSignal(serverNow());
  const timer = setInterval(() => setNow(serverNow()), intervalMs);
  return { now, stop: () => clearInterval(timer) };
}
