/**
 * Pending-acknowledgement registry for fire-and-forget sockets.
 *
 * A WebSocket `send()` only means "handed to the OS" — it is not a save. The
 * exam room waits for the server's `{"type":"saved", question_id}` frame before
 * it may tell a student their answer is stored. `wait(key)` hands back a promise
 * that settles on `ack(key)`, rejects on `fail(key)` (an error frame that names
 * the question it refused), rejects on `failAll()` (an unattributed error frame,
 * or a socket drop — which invalidates every pending save) and rejects on its
 * own timeout when nothing ever comes back.
 *
 * A second `wait()` for the same key means the student saved again: the older
 * promise resolves `"superseded"` so its caller stays quiet and the newer save
 * owns the badge.
 */
export type AckResult = "ok" | "superseded";

/** Rejection reason when nothing came back at all — callers localize it. */
export const ACK_TIMEOUT = "ack timeout";

export function createAckWaiter(timeoutMs = 8000) {
  const pending = new Map<
    string,
    { settle: (result: AckResult) => void; fail: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  const take = (key: string) => {
    const entry = pending.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      pending.delete(key);
    }
    return entry;
  };

  return {
    wait(key: string): Promise<AckResult> {
      take(key)?.settle("superseded");
      return new Promise<AckResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(key);
          reject(new Error(ACK_TIMEOUT));
        }, timeoutMs);
        pending.set(key, { settle: resolve, fail: reject, timer });
      });
    },
    ack(key: string) {
      take(key)?.settle("ok");
    },
    /** Reject one save — the server blamed this question and no other. */
    fail(key: string, reason: Error) {
      take(key)?.fail(reason);
    },
    failAll(reason: Error) {
      for (const key of [...pending.keys()]) take(key)?.fail(reason);
    },
    get size() {
      return pending.size;
    },
  };
}
