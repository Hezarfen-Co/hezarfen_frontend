import { ragCopy } from "./rag-copy";

it("puts the documented abstention codes in plain words and leaves unknown ones as they are", () => {
  expect(ragCopy("tr").abstainedReason("insufficient_data")).toBe("Neden: ders içeriklerinde bunu yanıtlayacak kadar bilgi yok");
  expect(ragCopy("en").abstainedReason("guard_pii")).toBe("Reason: the question was stopped by the content rules");
  expect(ragCopy("tr").abstainedReason("something_new")).toBe("Neden: something_new");
});
