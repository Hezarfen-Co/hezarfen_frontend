import { describe, expect, it } from "vitest";
import { triggerConfetti } from "../confetti";

describe("triggerConfetti", () => {
  it("safely handles server-side / node environment without window object", () => {
    expect(() => triggerConfetti({ particleCount: 10 })).not.toThrow();
  });
});
