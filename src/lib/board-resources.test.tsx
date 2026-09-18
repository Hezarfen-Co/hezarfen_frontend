import { createRoot } from "solid-js";
import { expect, test, vi } from "vitest";
import { createBoardResources } from "@/lib/board-resources";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a failed source reads as undefined and only it is retried", async () => {
  const good = vi.fn(async () => "ok");
  let fail = true;
  const flaky = vi.fn(async () => {
    if (fail) throw new Error("boom");
    return "recovered";
  });

  await createRoot(async (dispose) => {
    const board = createBoardResources();
    const [a] = board.createResource(good);
    const [b] = board.createResource(flaky);
    await tick();

    expect(a()).toBe("ok");
    expect(b()).toBeUndefined();
    expect(b.latest).toBeUndefined();
    expect(b.error).toBeInstanceOf(Error);

    fail = false;
    board.retryFailed();
    await tick();

    expect(b()).toBe("recovered");
    expect(b.error).toBeUndefined();
    expect(good).toHaveBeenCalledTimes(1);
    expect(flaky).toHaveBeenCalledTimes(2);
    dispose();
  });
});
