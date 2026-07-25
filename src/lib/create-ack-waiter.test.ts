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
    w.failAll(new Error("disconnected"));
    await expect(a).rejects.toThrow("disconnected");
    await expect(b).rejects.toThrow("disconnected");
    expect(w.size).toBe(0);
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
    w.failAll(new Error("cleanup"));
  });

  it("marks an overtaken save superseded instead of failing it", async () => {
    const w = createAckWaiter(1000);
    const first = w.wait("q1");
    const second = w.wait("q1");
    await expect(first).resolves.toBe("superseded");
    w.ack("q1");
    await expect(second).resolves.toBe("ok");
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
