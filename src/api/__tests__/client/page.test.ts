import { describe, expect, it } from "vitest";
import { appendPageParams, normalizePage, PageShapeError, pageQuery } from "../../client";

describe("page helpers", () => {
  describe("pageQuery", () => {
    it("returns empty string when no params", () => {
      expect(pageQuery()).toBe("");
      expect(pageQuery({})).toBe("");
    });

    it("formats limit and offset", () => {
      expect(pageQuery({ limit: 10 })).toBe("?limit=10");
      expect(pageQuery({ offset: 20 })).toBe("?offset=20");
      expect(pageQuery({ limit: 10, offset: 20 })).toBe("?limit=10&offset=20");
    });

    it("formats the schedule window and omits undefined keys", () => {
      expect(pageQuery({ ends_after: 1_700_000_000_000 })).toBe("?ends_after=1700000000000");
      expect(pageQuery({ starts_after: 1_700_000_000_000 })).toBe("?starts_after=1700000000000");
      expect(pageQuery({ limit: 50, ends_after: 1_700_000_000_000 })).toBe(
        "?limit=50&ends_after=1700000000000"
      );
      // Present-but-empty (`?ends_after=`) is a hard 400 server-side, so an
      // undefined filter must drop the key, not serialize as a blank value.
      expect(pageQuery({ limit: 50, ends_after: undefined, starts_after: undefined })).toBe(
        "?limit=50"
      );
    });
  });

  describe("appendPageParams", () => {
    it("does nothing when no params", () => {
      const base = new URLSearchParams();
      appendPageParams(base);
      expect(base.toString()).toBe("");
    });

    it("appends limit and offset", () => {
      const base = new URLSearchParams({ q: "test" });
      appendPageParams(base, { limit: 10, offset: 20 });
      expect(base.get("limit")).toBe("10");
      expect(base.get("offset")).toBe("20");
      expect(base.get("q")).toBe("test");
    });
  });

  describe("normalizePage", () => {
    it("handles legacy array", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const normalized = normalizePage(data);
      expect(normalized.items).toEqual(data);
      expect(normalized.total).toBe(2);
      expect(normalized.limit).toBeNull();
      expect(normalized.offset).toBe(0);
    });

    it("handles correct Page object", () => {
      const data = {
        items: [{ id: 1 }],
        total: 100,
        limit: 10,
        offset: 20,
      };
      const normalized = normalizePage(data);
      expect(normalized).toEqual(data);
    });

    it("handles partial Page object with missing properties", () => {
      const data = {
        items: [{ id: 1 }],
      };
      const normalized = normalizePage(data);
      expect(normalized.items).toEqual(data.items);
      expect(normalized.total).toBe(1); // falls back to items.length
      expect(normalized.limit).toBeNull();
      expect(normalized.offset).toBe(0);
    });

    it("rejects an invalid response instead of rendering a false empty list", () => {
      for (const data of [null, undefined, "string", { foo: "bar" }]) {
        expect(() => normalizePage(data)).toThrow(PageShapeError);
      }
    });
  });
});
