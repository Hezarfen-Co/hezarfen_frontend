import { MAX_PAGES, parsePages } from "@/lib/question-generation";

describe("parsePages", () => {
  it("expands ranges and single pages, sorted and de-duplicated", () => {
    expect(parsePages("3-5, 10, 4")).toEqual([3, 4, 5, 10]);
    expect(parsePages(" 7 ")).toEqual([7]);
  });

  it("refuses anything that is not a page list", () => {
    expect(parsePages("")).toBeNull();
    expect(parsePages("abc")).toBeNull();
    expect(parsePages("5-3")).toBeNull();
    expect(parsePages("0")).toBeNull();
    expect(parsePages("2,,x")).toBeNull();
  });

  it("refuses more pages than one request may name", () => {
    expect(parsePages(`1-${MAX_PAGES}`)).toHaveLength(MAX_PAGES);
    expect(parsePages(`1-${MAX_PAGES + 1}`)).toBeNull();
  });
});
