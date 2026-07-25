import { describe, expect, it, vi } from "vitest";
import { createAckWaiter } from "./create-ack-waiter";

describe("createAckWaiter", () => {
  it("resolves ok only when the matching ack arrives", async () => {
    const w = createAckWaiter(1000);
    const p = w.wait("q1");
    w.ack("q2"); // another question's ack must not confirm this one
    expect(w.size).toBe(1);
    w.ack("q1");
    await expect(p).resolves.toBe("ok");
    expect(w.size).toBe(0);
  });

  it("rejects when no ack ever comes back", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(8000);
    const p = w.wait("q1");
    const assertion = expect(p).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
    expect(w.size).toBe(0);
    vi.useRealTimers();
  });

  it("rejects every pending wait on failAll (error frame / socket drop)", async () => {
    const w = createAckWaiter(1000);
    const a = w.wait("q1");
    const b = w.wait("q2");
    w.failAll(new Error("disconnected"), "socket-closed");
    await expect(a).rejects.toThrow("disconnected");
    await expect(b).rejects.toThrow("disconnected");
    expect(w.size).toBe(0);
  });

  // Regression (defect 1): an unattributed error frame does NOT close the socket
  // (`exam_ws.rs:496` keeps serving), so the frames owed to the sends it rejected
  // are still on their way. One of them must not confirm the student's retry.
  it("does not let an in-flight ack confirm the retry after an unattributed error frame", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait("q1");
    const firstAssertion = expect(first).rejects.toThrow("state unavailable");
    w.failAll(new Error("state unavailable"), "error-frame"); // socket stays open
    await firstAssertion;

    const retry = w.wait("q1");
    let outcome: string | undefined;
    void retry.then(
      (r) => { outcome = `resolved:${r}`; },
      (e: Error) => { outcome = `rejected:${e.message}`; },
    );
    w.ack("q1"); // the FIRST send's `saved` frame, still in flight
    await Promise.resolve();
    expect(outcome).toBeUndefined(); // must NOT claim the retry was saved

    w.ack("q1"); // now the retry's own frame
    await expect(retry).resolves.toBe("ok");
  });

  // A genuine socket close means nothing is coming: the debt must not survive
  // into the reconnect, or the next save on that question would eat its own ack.
  it("clears owed frames when the socket actually closes", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait("q1");
    const firstAssertion = expect(first).rejects.toThrow("state unavailable");
    w.failAll(new Error("state unavailable"), "error-frame");
    await firstAssertion;

    w.failAll(new Error("disconnected"), "socket-closed"); // socket drops, reconnect
    const afterReconnect = w.wait("q1");
    w.ack("q1");
    await expect(afterReconnect).resolves.toBe("ok");
  });

  it("fails only the named save when the error frame blames one question", async () => {
    const w = createAckWaiter(1000);
    const a = w.wait("q1");
    const b = w.wait("q2");
    w.fail("q1", new Error("a choice question takes selected"));
    await expect(a).rejects.toThrow("a choice question takes selected");
    expect(w.size).toBe(1); // q2 is still waiting for its own answer
    w.ack("q2");
    await expect(b).resolves.toBe("ok");
  });

  it("ignores a fail for a question with nothing in flight", () => {
    const w = createAckWaiter(1000);
    void w.wait("q1").catch(() => {});
    w.fail("q2", new Error("boom")); // late/unknown blame must not touch q1
    expect(w.size).toBe(1);
    w.failAll(new Error("cleanup"), "socket-closed");
  });

  it("marks an overtaken save superseded and lets its own ack settle nobody", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait("q1");
    const second = w.wait("q1");
    await expect(first).resolves.toBe("superseded");
    expect(w.size).toBe(1);
    w.ack("q1"); // the first send's ack — the second is still unconfirmed
    expect(w.size).toBe(1);
    w.ack("q1"); // now the second send's own ack
    await expect(second).resolves.toBe("ok");
    expect(w.size).toBe(0);
  });

  // Regression: a `saved` frame for a send that already timed out must never
  // confirm the retry that replaced it — that told students "Saved" for an
  // answer the server had refused.
  it("does not let a timed-out send's late ack confirm the retry", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(8000);
    const first = w.wait("q1"); // student saves "A"
    const firstAssertion = expect(first).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(8000);
    await firstAssertion;

    const retry = w.wait("q1"); // student presses save again with "B"
    let outcome: string | undefined;
    void retry.then(
      (r) => { outcome = `resolved:${r}`; },
      (e: Error) => { outcome = `rejected:${e.message}`; },
    );

    w.ack("q1"); // the FIRST send's late `saved` frame finally lands
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBeUndefined(); // must NOT claim the retry was saved

    w.fail("q1", new Error("a choice question takes selected")); // the retry's own error frame
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe("rejected:a choice question takes selected");
    vi.useRealTimers();
  });

  // Regression (defect 2): the old tombstone was dropped by a timer after one
  // more timeout window, so a frame arriving after that settled the NEXT live
  // send "ok". Debt has no expiry — it is only ever paid off by a frame.
  it("does not let a very late ack confirm a newer send once the tombstone window would have lapsed", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(8000);
    const first = w.wait("q1"); // t=0, send #1
    const firstAssertion = expect(first).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(8000); // t=8s, send #1 times out
    await firstAssertion;

    await vi.advanceTimersByTimeAsync(1000); // t=9s
    const second = w.wait("q1"); // send #2, live
    let outcome: string | undefined;
    void second.then(
      (r) => { outcome = `resolved:${r}`; },
      (e: Error) => { outcome = `rejected:${e.message}`; },
    );

    await vi.advanceTimersByTimeAsync(7000); // t=16s, old tombstone expiry moment
    w.ack("q1"); // send #1's frame lands at last
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBeUndefined(); // must NOT confirm send #2

    w.ack("q1"); // send #2's own frame
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe("resolved:ok");
    vi.useRealTimers();
  });

  it("does not confirm after a timeout has already fired", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(100);
    const p = w.wait("q1");
    const assertion = expect(p).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(100);
    w.ack("q1"); // late ack: nothing to settle, must not throw
    await assertion;
    vi.useRealTimers();
  });
});
