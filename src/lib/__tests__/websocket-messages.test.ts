import { describe, expect, it } from "vitest";
import { parseBoardWsMessage, parseExamWsMessage } from "@/lib/websocket-messages";

describe("websocket message parsers", () => {
  it("accepts only a complete exam state frame", () => {
    expect(parseExamWsMessage({ type: "state", status: "in_progress", deadline: null, remaining_ms: 1000, now: 1, answered: 0, question_count: 1 })).not.toBeNull();
    expect(parseExamWsMessage({ type: "state", status: "open" })).toBeNull();
    expect(parseExamWsMessage({ type: "saved", question_id: "q", updated_at: "now" })).toBeNull();
  });

  it("rejects malformed whiteboard frames before they reach the canvas", () => {
    expect(parseBoardWsMessage({ type: "stroke", id: "s", author: "u", payload: "{}", epoch: 1 })).not.toBeNull();
    expect(parseBoardWsMessage({ type: "stroke", id: "s", author: "u", payload: {}, epoch: 1 })).toBeNull();
    expect(parseBoardWsMessage({ type: "participants", creator: "u", participants: ["a", 1] })).toBeNull();
  });
});
