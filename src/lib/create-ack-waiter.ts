/**
 * Pending-acknowledgement registry for fire-and-forget sockets.
 *
 * A WebSocket `send()` only means "handed to the OS" — it is not a save. The
 * exam room waits for the server's `{"type":"saved", question_id}` frame before
 * it may tell a student their answer is stored. `wait(seq, key)` hands back a
 * promise that settles on `ack(seq)`, rejects on `fail(seq)` (an error frame
 * that names the send it refused), rejects on `failAll()` (a socket drop, or a
 * frame that identifies no send at all) and rejects on its own timeout when
 * nothing ever comes back.
 *
 * **Acks are matched per send, not per question.** Every `answer` frame carries
 * a `client_seq` the caller mints, and the server echoes it on the one
 * `saved`/`error` frame that answers it — so a reply names its send exactly.
 * Nothing is ever inferred from arrival order: a send that timed out or was
 * overtaken is simply gone, and its late frame finds no entry and settles
 * nobody. The `client_seq` is opaque to the server (no dedupe, no ordering);
 * uniqueness within a socket's lifetime is the caller's job.
 *
 * A second `wait()` for the same key means the student saved again: the older
 * promise resolves `"superseded"` so its caller stays quiet and the newer save
 * owns the badge.
 */
export type AckResult = "ok" | "superseded";

/** Rejection reason when nothing came back at all — callers localize it. */
export const ACK_TIMEOUT = "ack timeout";

type Entry = {
  /** Question this send belongs to — only used to supersede its older sends. */
  key: string;
  settle: (result: AckResult) => void;
  fail: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function createAckWaiter(timeoutMs = 8000) {
  /** client_seq → the send still waiting on its reply. */
  const pending = new Map<number, Entry>();

  const take = (seq: number) => {
    const entry = pending.get(seq);
    if (!entry) return undefined;
    pending.delete(seq);
    clearTimeout(entry.timer);
    return entry;
  };

  return {
    wait(seq: number, key: string): Promise<AckResult> {
      for (const [at, entry] of [...pending]) {
        if (entry.key !== key) continue;
        pending.delete(at);
        clearTimeout(entry.timer);
        entry.settle("superseded");
      }
      return new Promise<AckResult>((resolve, reject) => {
        pending.set(seq, {
          key,
          settle: resolve,
          fail: reject,
          timer: setTimeout(() => {
            pending.delete(seq);
            reject(new Error(ACK_TIMEOUT));
          }, timeoutMs),
        });
      });
    },
    ack(seq: number) {
      take(seq)?.settle("ok");
    },
    /** Reject one save — the server blamed this send and no other. */
    fail(seq: number, reason: Error) {
      take(seq)?.fail(reason);
    },
    /**
     * Reject everything in flight: the socket dropped, or a frame arrived that
     * named no send (a room-level error, or an older server that echoes no
     * `client_seq`). Refusing them all is the safe read — a badge must never
     * say "Saved" for a payload the server did not confirm.
     */
    failAll(reason: Error) {
      for (const [seq] of [...pending]) take(seq)?.fail(reason);
    },
    /** Sends still waiting for an outcome. */
    get size() {
      return pending.size;
    },
  };
}
