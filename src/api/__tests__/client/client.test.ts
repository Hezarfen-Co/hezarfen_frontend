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

    it("coalesces simultaneous identical GETs without caching later reads", async () => {
      let resolve!: (value: Response) => void;
      vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
      const first = client("/shared");
      const second = client("/shared");
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
      mockFetchSuccess({ fresh: true });
      await expect(client("/shared")).resolves.toEqual({ fresh: true });
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

  describe("client() timeout", () => {
    // hang until whatever signal fetch was given aborts
    const hangingFetch = () =>
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) return; // no deadline at all -> test times out, which is the bug
            signal.addEventListener("abort", () => reject(signal.reason));
          }),
      );

    it("fails a hung request as a localized ApiError instead of hanging forever", async () => {
      // shrink the real deadline; everything else (AbortSignal.any, the catch) runs for real
      const realTimeout = AbortSignal.timeout.bind(AbortSignal);
      vi.spyOn(AbortSignal, "timeout").mockImplementation(() => realTimeout(5));
      hangingFetch();
      await expect(client("/slow")).rejects.toMatchObject({ name: "ApiError", status: 408 });
      try {
        await client("/slow");
      } catch (err) {
        expect(formatApiError(err, "tr")).toBe("Sunucu zamanında yanıt vermedi. Bağlantını kontrol edip tekrar dene.");
        expect(formatApiError(err, "en")).toBe("The server did not respond in time. Check your connection and try again.");
      }
    });

    // headers arrive promptly, the body stalls — the multi-MB shell feed on a
    // school connection. The deadline lands while res.text() is streaming.
    const stallingBodyFetch = () =>
      vi.spyOn(globalThis, "fetch").mockImplementation((_url, init?: RequestInit) => {
        const signal = init?.signal;
        const stream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(new TextEncoder().encode('{"items":['));
            signal?.addEventListener("abort", () => ctrl.error(signal.reason));
          },
        });
        return Promise.resolve(new Response(stream, { status: 200 }));
      });

    it("fails a timeout during body streaming as ApiError 408, not a raw DOMException", async () => {
      const realTimeout = AbortSignal.timeout.bind(AbortSignal);
      vi.spyOn(AbortSignal, "timeout").mockImplementation(() => realTimeout(5));
      stallingBodyFetch();
      await expect(client("/big-feed")).rejects.toMatchObject({ name: "ApiError", status: 408 });
      try {
        await client("/big-feed");
      } catch (err) {
        expect(formatApiError(err, "tr")).toBe("Sunucu zamanında yanıt vermedi. Bağlantını kontrol edip tekrar dene.");
      }
    });

    it("still surfaces a caller abort mid-body as AbortError, not a timeout", async () => {
      stallingBodyFetch();
      const ctrl = new AbortController();
      const pending = client("/big-feed", { signal: ctrl.signal });
      await Promise.resolve();
      ctrl.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    });

    it("still surfaces a caller abort as AbortError, not a timeout", async () => {
      hangingFetch();
      const ctrl = new AbortController();
      const pending = client("/slow", { signal: ctrl.signal });
      ctrl.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
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

    it("localizes the settings duplicate-entry error (Turkish casing)", () => {
      // exact backend strings from settings.rs validate_list — a miss here renders
      // "İşlem tamamlanamadı: <raw English>" to a Turkish admin
      const kinds = "exam_kinds: two entries are the same word apart from upper/lower case or Turkish letters — keep only one of them";
      const statuses =
        "attendance_statuses: two entries are the same word apart from upper/lower case or Turkish letters — keep only one of them";
      expect(formatApiErrorMessage(kinds, "tr")).toBe(
        "İki sınav türü, büyük/küçük harf veya Türkçe harf farkı dışında aynı. Sadece birini bırak.",
      );
      expect(formatApiErrorMessage(statuses, "tr")).toBe(
        "İki yoklama durumu, büyük/küçük harf veya Türkçe harf farkı dışında aynı. Sadece birini bırak.",
      );
      expect(formatApiErrorMessage(kinds, "en")).toBe(
        "Two exam kinds are the same word apart from upper/lower case or Turkish letters. Keep only one of them.",
      );
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

    it("localizes question-bank permission and attempt conflicts", () => {
      // exact backend strings from web/bank_questions.rs + web/exams.rs
      expect(formatApiErrorMessage("only the template's owner or an admin can change it", "tr")).toBe(
        "Bu şablonu yalnızca onu oluşturan öğretmen (veya bir yönetici) değiştirebilir.",
      );
      expect(
        formatApiErrorMessage("only the course creator, an assigned teacher, or a manager/admin can save questions to the bank", "en"),
      ).toBe("Only this course's teachers or a manager can save this question to the bank.");
      expect(formatApiError(new ApiError(409, "cannot change questions after attempts have started"), "tr")).toBe(
        "Öğrenciler bu sınava başladığı için soruları artık değiştirilemez.",
      );
      expect(
        formatApiErrorMessage("only the course creator, an assigned teacher, or a manager/admin can author questions", "tr"),
      ).toBe("Bu sınava yalnızca dersin öğretmenleri veya bir müdür soru ekleyebilir.");
    });

    it("falls back to a clean localized message for unmapped errors (no raw leak)", () => {
      expect(formatApiErrorMessage("custom error occurred", "en")).toBe(
        "Something went wrong. Please check your input and try again.",
      );
      expect(formatApiErrorMessage("custom error occurred", "tr")).toBe(
        "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar dene.",
      );
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

    it("prefers the table entry over the per-status generic message", () => {
      // the whole 403 table was dead code: every 403 rendered "forbidden"
      expect(formatApiError(new ApiError(403, "only the template's owner or an admin can change it"), "tr")).toBe(
        "Bu şablonu yalnızca onu oluşturan öğretmen (veya bir yönetici) değiştirebilir.",
      );
      expect(
        formatApiError(new ApiError(403, "only the course creator, an assigned teacher, or a manager/admin can author questions"), "tr"),
      ).toBe("Bu sınava yalnızca dersin öğretmenleri veya bir müdür soru ekleyebilir.");
      expect(
        formatApiError(
          new ApiError(403, "only the course creator, an assigned teacher, or a manager/admin can save questions to the bank"),
          "en",
        ),
      ).toBe("Only this course's teachers or a manager can save this question to the bank.");
      // same ordering bug shape for 404 ("course not found" / "exam not found")
      expect(formatApiError(new ApiError(404, "exam not found"), "tr")).toBe("Sınav bulunamadı.");
      expect(formatApiError(new ApiError(404, "course not found"), "en")).toBe("Course not found.");
      // unmatched messages still fall back to the generic per-status message
      expect(formatApiError(new ApiError(403, "some brand new refusal"), "tr")).toBe("Bu işlem için yetkin yok.");
      expect(formatApiError(new ApiError(404, ""), "en")).toBe("The requested record was not found.");
    });

    it("localizes appointment booking and decision conflicts", () => {
      // exact backend strings from domain/appointment.rs — a miss renders
      // "İşlem tamamlanamadı: <English>"
      const cases: Array<[string, string]> = [
        ["the slot is already booked", "Bu saati senden önce başkası aldı."],
        ["the slot has already started", "Bu saat başladığı için artık randevu alınamaz."],
        ["you already have an appointment at that time", "O saatte zaten bir randevun var."],
        ["the appointment is already settled", "Bu randevu zaten sonuçlanmış."],
        ["the appointment has already started", "Bu randevu çoktan başladı."],
        ["that time has already started", "O saat çoktan başladı. Daha ileri bir saat seç."],
        ["no time has been proposed", "Bu randevu için henüz bir saat önerilmedi."],
        ["the appointment is no longer pending", "Bu randevu artık yanıt bekliyor değil."],
      ];
      for (const [backend, turkish] of cases) {
        expect(formatApiError(new ApiError(409, backend), "tr")).toBe(turkish);
        expect(formatApiError(new ApiError(409, backend), "en")).not.toMatch(/^İşlem/);
        expect(formatApiErrorMessage(backend, "en")).toMatch(/\.$/);
      }
    });

    it("localizes the refresh-from-bank validation error", () => {
      // ValidationError::Invalid renders "{field}: {reason}" (web/exams.rs:2013)
      expect(formatApiError(new ApiError(400, "question: this question did not come from a bank template"), "tr")).toBe(
        "Bu soru bir banka şablonundan kopyalanmadığı için yenilenecek bir kaynağı yok.",
      );
      expect(formatApiError(new ApiError(400, "question: this question did not come from a bank template"), "en")).toBe(
        "This question was not copied from a bank template, so there is nothing to refresh it from.",
      );
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
      expect(formatApiError(new Error("generic"), "en")).toBe("Something went wrong. Please check your input and try again.");
      expect(formatApiError(new Error("generic"), "tr")).toBe("İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar dene.");
    });

    it("does not expose network, runtime, or provider errors to users", () => {
      expect(formatApiError(new TypeError("Failed to fetch"), "tr")).toBe(
        "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.",
      );
      expect(formatApiError(new TypeError("Cannot read properties of null (reading 'user')"), "tr")).toBe(
        "Sayfa yüklenirken bir sorun oluştu. Sayfayı yeniden yükleyip tekrar dene.",
      );
      expect(formatApiError(new Error("useAuth must be used within AuthProvider"), "en")).toBe(
        "Something went wrong while loading the page. Reload the page and try again.",
      );
    });
  });
});
