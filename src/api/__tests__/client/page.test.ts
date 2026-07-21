import { describe, expect, it } from "vitest";
import { appendPageParams, normalizePage, pageQuery } from "../../page";

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

    it("handles invalid data gracefully", () => {
      expect(normalizePage(null)).toEqual({ items: [], total: 0, limit: null, offset: 0 });
      expect(normalizePage(undefined)).toEqual({ items: [], total: 0, limit: null, offset: 0 });
      expect(normalizePage("string")).toEqual({ items: [], total: 0, limit: null, offset: 0 });
      expect(normalizePage({ foo: "bar" })).toEqual({ items: [], total: 0, limit: null, offset: 0 });
    });
  });
});
