/**
 * Pending-acknowledgement registry for fire-and-forget sockets.
 *
 * A WebSocket `send()` only means "handed to the OS" — it is not a save. The
 * exam room waits for the server's `{"type":"saved", question_id}` frame before
 * it may tell a student their answer is stored. `wait(key)` hands back a promise
 * that settles on `ack(key)`, rejects on `fail(key)` (an error frame that names
 * the question it refused), rejects on `failAll()` (a socket drop, or an
 * unattributed error frame) and rejects on its own timeout when nothing ever
 * comes back.
 *
 * **Acks are matched per send, not per question.** The server answers every
 * `answer` frame with exactly one `saved`/`error` frame, in order
 * (`exam_ws.rs:396,410`), so each key keeps a FIFO queue of the sends that still
 * own a promise, plus `owed`: a count of frames the server still has to send for
 * sends that no longer own anybody's promise (they timed out, a newer save
 * overtook them, or an unattributed error frame rejected them while the socket
 * stayed open). Those dead sends are always older than any live one, so an
 * incoming frame pays off `owed` first and is discarded; only once the debt is
 * clear does a frame settle the oldest live send. That is exact and timer-free —
 * nothing can expire into the wrong match, and send #1's late `saved` can never
 * confirm send #2.
 *
 * Trade-off: if the server truly never answers a send, its debt sits there and
 * swallows one later legitimate frame, so that question's next save reads "not
 * saved" and the student presses save again. Wrong in the safe direction — the
 * badge never claims "Saved" for a payload the server did not accept. The debt
 * is not permanent: a socket close clears it (`failAll(..., "socket-closed")`),
 * so a reconnect always starts from zero.
 *
 * A second `wait()` for the same key means the student saved again: the older
 * promise resolves `"superseded"` so its caller stays quiet and the newer save
 * owns the badge.
 */
export type AckResult = "ok" | "superseded";

/** Rejection reason when nothing came back at all — callers localize it. */
export const ACK_TIMEOUT = "ack timeout";

type Entry = {
  settle: (result: AckResult) => void;
  fail: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Why every pending save is being rejected at once:
 * - `socket-closed` — the socket dropped or we replaced it. Nothing is coming,
 *   ever, so both the queue and the debt are wiped.
 * - `error-frame` — the server refused something it could not attribute to one
 *   question and **kept the socket open** (`exam_ws.rs:496` sends
 *   `error_frame_for(err, None)` and keeps serving). Each in-flight send is
 *   still owed its own frame, so rejecting them turns them into debt.
 */
export type FailAllCause = "socket-closed" | "error-frame";

export function createAckWaiter(timeoutMs = 8000) {
  const queues = new Map<string, Entry[]>();
  /** key → frames the server still owes for sends nobody is waiting on anymore. */
  const owed = new Map<string, number>();

  /** This send lost its owner but the server will still answer it: bank the debt. */
  const disown = (key: string, entry: Entry) => {
    clearTimeout(entry.timer);
    const queue = queues.get(key);
    const at = queue?.indexOf(entry) ?? -1;
    if (queue && at >= 0) queue.splice(at, 1);
    if (queue && queue.length === 0) queues.delete(key);
    owed.set(key, (owed.get(key) ?? 0) + 1);
  };

  /**
   * Pop the send an incoming frame belongs to, or `undefined` when the frame
   * pays off an older dead send instead (debt is always older than live sends).
   */
  const takeOldest = (key: string) => {
    const debt = owed.get(key) ?? 0;
    if (debt > 0) {
      if (debt === 1) owed.delete(key);
      else owed.set(key, debt - 1);
      return undefined;
    }
    const queue = queues.get(key);
    if (!queue || queue.length === 0) return undefined;
    const entry = queue.shift()!;
    if (queue.length === 0) queues.delete(key);
    clearTimeout(entry.timer);
    return entry;
  };

  return {
    wait(key: string): Promise<AckResult> {
      // Disowning the last live entry drops the queue, so re-seat it afterwards.
      for (const entry of [...(queues.get(key) ?? [])]) {
        entry.settle("superseded");
        disown(key, entry);
      }
      const queue = queues.get(key) ?? [];
      queues.set(key, queue);
      return new Promise<AckResult>((resolve, reject) => {
        const entry: Entry = {
          settle: resolve,
          fail: reject,
          timer: setTimeout(() => {
            entry.fail(new Error(ACK_TIMEOUT));
            disown(key, entry);
          }, timeoutMs),
        };
        queue.push(entry);
      });
    },
    ack(key: string) {
      takeOldest(key)?.settle("ok");
    },
    /** Reject one save — the server blamed this question and no other. */
    fail(key: string, reason: Error) {
      takeOldest(key)?.fail(reason);
    },
    failAll(reason: Error, cause: FailAllCause) {
      for (const [key, queue] of [...queues]) {
        for (const entry of [...queue]) {
          entry.fail(reason);
          if (cause === "error-frame") disown(key, entry);
          else clearTimeout(entry.timer);
        }
        if (cause === "socket-closed") queues.delete(key);
      }
      // A dead socket answers nothing: the reconnect must not inherit old debt.
      if (cause === "socket-closed") owed.clear();
    },
    /** Sends still waiting for an outcome — banked debt doesn't count. */
    get size() {
      let n = 0;
      for (const queue of queues.values()) n += queue.length;
      return n;
    },
  };
}
