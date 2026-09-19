import type { RagCitation } from "@/api/client";
import { scopeFromCitations } from "./rag-study-scope";

const cite = (n: number, ders: string | null, spans: string[], pages: number[]): RagCitation => ({ n, ders, span_ids: spans, pages });

it("studies the subject most citations come from, with exactly its passages", () => {
  const scope = scopeFromCitations(
    [cite(1, "Fizik", ["a", "b"], [4, 3]), cite(2, "Kimya", ["x"], [9]), cite(3, "Fizik", ["b", "c"], [5])],
    "  Newton'un ikinci yasası nedir?  ",
  );
  expect(scope).toEqual({
    ders: "Fizik",
    span_ids: ["a", "b", "c"],
    pages: [3, 4, 5],
    scope_label: "Newton'un ikinci yasası nedir?",
  });
});

it("gives no scope when no citation names a subject or carries a passage", () => {
  expect(scopeFromCitations([cite(1, null, ["a"], [1]), cite(2, "Fizik", [], [2])])).toBeNull();
  expect(scopeFromCitations([])).toBeNull();
});
