import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, blobClient, client, formatApiError, formatApiErrorMessage, formClient } from "../../client";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchError, mockFetchSuccess } from "../helpers/mock-fetch";

describe("client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("client()", () => {
    it("makes GET request with correct URL", async () => {
      mockFetchSuccess({ ok: true });
      const data = await client("/test");
      expect(data).toEqual({ ok: true });
      const [url, init] = lastFetchCall();
      expect(url).toBe("/api/test");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("same-origin");
    });

    it("makes POST request with JSON body", async () => {
      mockFetchSuccess({ ok: true });
      const body = { foo: "bar" };
      await client("/test", { method: "POST", body });
      const [, init] = lastFetchCall();
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify(body));
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    });

    it("handles 204 No Content", async () => {
      mockFetch204();
      const res = await client("/test");
      expect(res).toBeUndefined();
    });

    it("throws ApiError on failure with retryAfter", async () => {
      mockFetchError(429, { error: "Too Many Requests" }, { "Retry-After": "30" });
      try {
        await client("/test");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        if (err instanceof ApiError) {
          expect(err.status).toBe(429);
          expect(err.message).toBe("Too Many Requests");
          expect(err.retryAfter).toBe(30);
        }
      }
    });

    it("throws ApiError with default message if none provided", async () => {
      mockFetchError(500);
      try {
        await client("/test");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        if (err instanceof ApiError) {
          expect(err.status).toBe(500);
          expect(err.message).toBe("Error"); // From statusText in mock
        }
      }
    });
  });

  describe("formClient()", () => {
    it("makes POST request with FormData", async () => {
      mockFetchSuccess({ ok: true });
      const fd = new FormData();
      fd.append("file", new Blob(["test"]), "test.txt");
      await formClient("/test-form", fd);
      const [url, init] = lastFetchCall();
      expect(url).toBe("/api/test-form");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(fd);
    });

    it("throws ApiError on failure", async () => {
      mockFetchError(400, { error: "Bad form" });
      try {
        await formClient("/test-form", new FormData());
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        if (err instanceof ApiError) {
          expect(err.status).toBe(400);
          expect(err.message).toBe("Bad form");
        }
      }
    });
  });

  describe("blobClient()", () => {
    it("fetches blob successfully", async () => {
      const blob = new Blob(["hello"], { type: "text/plain" });
      mockFetchBlob(blob);
      const res = await blobClient("/test-blob");
      expect(res).toBeInstanceOf(Blob);
      expect(res.type).toBe("text/plain");
      const [url] = lastFetchCall();
      expect(url).toBe("/api/test-blob");
    });

    it("throws ApiError on failure", async () => {
      mockFetchError(404, { error: "Not found" });
      try {
        await blobClient("/test-blob");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        if (err instanceof ApiError) {
          expect(err.status).toBe(404);
          expect(err.message).toBe("Not found");
        }
      }
    });
  });

  describe("formatApiErrorMessage", () => {
    it("translates known messages", () => {
      expect(formatApiErrorMessage("unauthorized", "en")).toBe("Sign in to continue.");
      expect(formatApiErrorMessage("unauthorized", "tr")).toBe("Devam etmek için giriş yap.");
      expect(formatApiErrorMessage("forbidden", "tr")).toBe("Bu işlem için yetkin yok.");
    });

    it("localizes slot-overlap conflicts (no half-English fallback)", () => {
      // exact backend strings (lowercase) must map, not fall through to "İşlem tamamlanamadı: <english>"
      expect(formatApiErrorMessage("this time overlaps a slot you have already published", "tr")).toBe(
        "Bu zaman aralığı, daha önce yayınladığın bir müsaitlikle çakışıyor.",
      );
      expect(formatApiErrorMessage("a repeated slot overlaps one you have already published", "tr")).toBe(
        "Tekrarlanan müsaitliklerden biri, daha önce yayınladığın bir müsaitlikle çakışıyor.",
      );
      expect(formatApiErrorMessage("the repeated slots overlap each other", "en")).toBe("The repeated slots overlap each other.");
      // a 409 ApiError carrying the backend message resolves the same way
      expect(formatApiError(new ApiError(409, "this time overlaps a slot you have already published"), "tr")).toBe(
        "Bu zaman aralığı, daha önce yayınladığın bir müsaitlikle çakışıyor.",
      );
    });

    it("handles unknown messages with sentence case", () => {
      expect(formatApiErrorMessage("custom error occurred", "en")).toBe("Custom error occurred");
      expect(formatApiErrorMessage("custom error occurred", "tr")).toBe("İşlem tamamlanamadı: Custom error occurred");
    });

    it("localizes backend max-length validation messages", () => {
      const message = "Content must be at most 10000 characters (got 220896)";
      expect(formatApiErrorMessage(message, "en")).toBe("Content must be at most 10,000 characters. Currently 220,896 characters.");
      expect(formatApiErrorMessage(message, "tr")).toBe("İçerik en fazla 10.000 karakter olmalı. Şu an 220.896 karakter.");
    });
  });

  describe("formatApiError", () => {
    it("formats 429 with retry after", () => {
      const err = new ApiError(429, "Too many", 10);
      expect(formatApiError(err, "en")).toBe("Try again in 10s.");
      expect(formatApiError(err, "tr")).toBe("10 sn sonra tekrar dene.");
    });

    it("formats 401, 403, 404", () => {
      expect(formatApiError(new ApiError(401, ""), "en")).toBe("Sign in to continue.");
      expect(formatApiError(new ApiError(403, ""), "tr")).toBe("Bu işlem için yetkin yok.");
      expect(formatApiError(new ApiError(404, ""), "en")).toBe("The requested record was not found.");
    });

    it("formats 500+", () => {
      expect(formatApiError(new ApiError(500, ""), "en")).toBe("Server error. Please try again.");
      expect(formatApiError(new ApiError(503, ""), "tr")).toBe("Sunucuda bir sorun oluştu. Lütfen tekrar dene.");
    });

    it("formats 422 backend validation messages", () => {
      const err = new ApiError(422, "Title must be at most 200 characters (got 250)");
      expect(formatApiError(err, "tr")).toBe("Başlık en fazla 200 karakter olmalı. Şu an 250 karakter.");
    });

    it("formats generic Error", () => {
      expect(formatApiError(new Error("generic"), "en")).toBe("Generic");
      expect(formatApiError(new Error("generic"), "tr")).toBe("İşlem tamamlanamadı: Generic");
    });
  });
});
