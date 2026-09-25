import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteHolidayById,
  getHolidayById,
  getHolidays,
  patchHolidayById,
  postHoliday,
} from "../../holidays";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("holidays API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getHolidays GETs /holidays with paging and the overlap window", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getHolidays({ limit: 50, offset: 0, from: 1000, to: 2000 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays?limit=50&offset=0&from=1000&to=2000");
    expect(init?.method).toBe("GET");
  });

  it("getHolidays sends no query when unfiltered", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getHolidays();
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays");
    expect(init?.method).toBe("GET");
  });

  it("getHolidayById GETs /holidays/h1", async () => {
    mockFetchSuccess({ id: "x1" });
    await getHolidayById("h1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays/h1");
    expect(init?.method).toBe("GET");
  });

  it("postHoliday POSTs /holidays", async () => {
    mockFetchSuccess({ id: "x1" });
    await postHoliday({ name: "29 Ekim", kind: "resmi", starts_at: 1, ends_at: 2 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "29 Ekim", kind: "resmi", starts_at: 1, ends_at: 2 }));
  });

  it("patchHolidayById PATCHs /holidays/h1", async () => {
    mockFetchSuccess({ id: "x1" });
    await patchHolidayById("h1", { name: "Ara tatil" });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays/h1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ name: "Ara tatil" }));
  });

  it("deleteHolidayById DELETEs /holidays/h1", async () => {
    mockFetch204();
    await deleteHolidayById("h1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/holidays/h1");
    expect(init?.method).toBe("DELETE");
  });
});
