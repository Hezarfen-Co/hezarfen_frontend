import { describe, expect, it, vi } from "vitest";
import { createAckWaiter } from "./create-ack-waiter";

describe("createAckWaiter", () => {
  it("resolves ok only when the ack for that client_seq arrives", async () => {
    const w = createAckWaiter(1000);
    const p = w.wait(1, "q1");
    w.ack(2); // another send's ack must not confirm this one
    expect(w.size).toBe(1);
    w.ack(1);
    await expect(p).resolves.toBe("ok");
    expect(w.size).toBe(0);
  });

  it("rejects when no ack ever comes back", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(8000);
    const p = w.wait(1, "q1");
    const assertion = expect(p).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
    expect(w.size).toBe(0);
    vi.useRealTimers();
  });

  it("rejects every pending wait on failAll (unattributable frame / socket drop)", async () => {
    const w = createAckWaiter(1000);
    const a = w.wait(1, "q1");
    const b = w.wait(2, "q2");
    w.failAll(new Error("disconnected"));
    await expect(a).rejects.toThrow("disconnected");
    await expect(b).rejects.toThrow("disconnected");
    expect(w.size).toBe(0);
  });

  it("fails only the named send when the error frame echoes its client_seq", async () => {
    const w = createAckWaiter(1000);
    const a = w.wait(1, "q1");
    const b = w.wait(2, "q2");
    w.fail(1, new Error("a choice question takes selected"));
    await expect(a).rejects.toThrow("a choice question takes selected");
    expect(w.size).toBe(1); // q2 is still waiting for its own answer
    w.ack(2);
    await expect(b).resolves.toBe("ok");
  });

  it("ignores a fail for a client_seq with nothing in flight", () => {
    const w = createAckWaiter(1000);
    void w.wait(1, "q1").catch(() => {});
    w.fail(2, new Error("boom")); // late/unknown blame must not touch send #1
    expect(w.size).toBe(1);
    w.failAll(new Error("cleanup"));
  });

  it("marks an overtaken save superseded and lets its own ack settle nobody", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait(1, "q1");
    const second = w.wait(2, "q1");
    await expect(first).resolves.toBe("superseded");
    expect(w.size).toBe(1);
    w.ack(1); // the first send's ack — it owns nobody now
    expect(w.size).toBe(1);
    w.ack(2);
    await expect(second).resolves.toBe("ok");
    expect(w.size).toBe(0);
  });

  // Regression: a `saved` frame for a send that already timed out must never
  // confirm the retry that replaced it — that told students "Saved" for an
  // answer the server had refused. With exact correlation the late frame simply
  // names a send nobody waits on, and it no longer poisons the retry either.
  it("does not let a timed-out send's late ack confirm the retry", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(8000);
    const first = w.wait(1, "q1"); // student saves "A"
    const firstAssertion = expect(first).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(8000);
    await firstAssertion;

    const retry = w.wait(2, "q1"); // student presses save again with "B"
    let outcome: string | undefined;
    void retry.then(
      (r) => { outcome = `resolved:${r}`; },
      (e: Error) => { outcome = `rejected:${e.message}`; },
    );

    w.ack(1); // the FIRST send's late `saved` frame finally lands
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBeUndefined(); // must NOT claim the retry was saved

    w.ack(2); // the retry's own frame — no debt swallowed it
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe("resolved:ok");
    vi.useRealTimers();
  });

  // The unattributable-error path keeps the socket open, so the frames owed to
  // the sends it rejected are still on their way. They name their own client_seq
  // and settle nobody; the retry is confirmed by its own frame, not by theirs.
  it("does not let an in-flight ack confirm the retry after an unattributable error frame", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait(1, "q1");
    const firstAssertion = expect(first).rejects.toThrow("state unavailable");
    w.failAll(new Error("state unavailable")); // socket stays open
    await firstAssertion;

    const retry = w.wait(2, "q1");
    let outcome: string | undefined;
    void retry.then(
      (r) => { outcome = `resolved:${r}`; },
      (e: Error) => { outcome = `rejected:${e.message}`; },
    );
    w.ack(1); // the FIRST send's `saved` frame, still in flight
    await Promise.resolve();
    expect(outcome).toBeUndefined(); // must NOT claim the retry was saved

    w.ack(2);
    await expect(retry).resolves.toBe("ok");
  });

  it("does not confirm after a timeout has already fired", async () => {
    vi.useFakeTimers();
    const w = createAckWaiter(100);
    const p = w.wait(1, "q1");
    const assertion = expect(p).rejects.toThrow("ack timeout");
    await vi.advanceTimersByTimeAsync(100);
    w.ack(1); // late ack: nothing to settle, must not throw
    await assertion;
    vi.useRealTimers();
  });
});
