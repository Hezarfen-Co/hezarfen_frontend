import { describe, expect, it } from "vitest";
import { foldSearchText, matchesSearch, searchMatchRanges } from "@/lib/search-text";

describe("foldSearchText", () => {
  it("folds Turkish letters onto their ASCII shape", () => {
    expect(foldSearchText("Öğretmen ŞİŞLİ çığ")).toBe("ogretmen sisli cig");
  });

  it("folds the dotted capital I the way a Turkish reader expects", () => {
    expect(foldSearchText("İSTANBUL")).toBe("istanbul");
    expect(foldSearchText("Iğdır")).toBe("igdir");
  });

  it("drops combining marks it has no explicit rule for", () => {
    expect(foldSearchText("José Núñez")).toBe("jose nunez");
  });

  it("drops punctuation so a typed class matches the printed one", () => {
    expect(foldSearchText("9-A")).toBe("9a");
    expect(foldSearchText("ali.veli_1")).toBe("aliveli1");
  });

  it("treats empty input as an empty string", () => {
    expect(foldSearchText(null)).toBe("");
    expect(foldSearchText(undefined)).toBe("");
  });
});

describe("matchesSearch", () => {
  it("matches across diacritics in both directions", () => {
    expect(matchesSearch("ogretmen", "Öğretmen Ayşe")).toBe(true);
    expect(matchesSearch("Öğretmen", "ogretmen ayse")).toBe(true);
  });

  it("requires every term but not their order", () => {
    expect(matchesSearch("ayse 9a", "Ayşe Yılmaz", "9-A")).toBe(true);
    expect(matchesSearch("9a ayse", "Ayşe Yılmaz", "9-A")).toBe(true);
    expect(matchesSearch("ayse 10b", "Ayşe Yılmaz", "9-A")).toBe(false);
  });

  it("ignores stray whitespace and empty queries", () => {
    expect(matchesSearch("   ", "anything")).toBe(true);
    expect(matchesSearch("  ayse   yilmaz ", "Ayşe Yılmaz")).toBe(true);
  });

  it("skips fields with no value instead of matching on them", () => {
    expect(matchesSearch("ayse", null, undefined, "Ayşe")).toBe(true);
    expect(matchesSearch("ayse", null, undefined)).toBe(false);
  });
});

describe("searchMatchRanges", () => {
  it("keeps original offsets while folding Turkish letters", () => {
    expect(searchMatchRanges("Öğretmen Ayşe", "ogretmen")).toEqual([{ start: 0, end: 8 }]);
  });

  it("returns every occurrence in reading order", () => {
    expect(searchMatchRanges("Sınav bugün, sınav yarın", "sinav")).toEqual([
      { start: 0, end: 5 },
      { start: 13, end: 18 },
    ]);
  });
});
