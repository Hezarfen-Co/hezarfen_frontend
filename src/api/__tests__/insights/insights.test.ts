import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInsightByUserId,
  getInsightRunReport,
  getInsightRuns,
  getInsightsPending,
  getMyInsight,
  insightRunReportUrl,
  postInsightComputeByUserId,
  postInsightRunReport,
  postInsightsRefresh,
} from "../../insights";
import { lastFetchCall, mockFetchBlob, mockFetchError, mockFetchSuccess } from "../helpers/mock-fetch";

describe("insights API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyInsight GETs /insights/me", async () => {
    mockFetchSuccess({ user_id: "u1", attention: [], cards: [], segments: [] });

    const result = await getMyInsight();
    expect(result.user_id).toBe("u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/me");
    expect(init?.method).toBe("GET");
  });

  it("getInsightByUserId GETs /insights/students/{user}", async () => {
    mockFetchSuccess({ user_id: "u2", attention: [], cards: [], segments: [] });

    await getInsightByUserId("u2");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/students/u2");
    expect(init?.method).toBe("GET");
  });

  it("getInsightByUserId encodes the user id", async () => {
    mockFetchSuccess({ user_id: "a/b", attention: [], cards: [], segments: [] });

    await getInsightByUserId("a/b");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/insights/students/a%2Fb");
  });

  it("postInsightComputeByUserId POSTs the sections and since window", async () => {
    mockFetchSuccess({ message_id: "m1", status: "pending" }, 202);

    const result = await postInsightComputeByUserId("u2", { sections: ["marks"], since: "2026-09-01" });
    expect(result.status).toBe("pending");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/students/u2");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ sections: ["marks"], since: "2026-09-01" }));
  });

  it("postInsightComputeByUserId sends an empty body when no window is given", async () => {
    mockFetchSuccess({ message_id: "m1", status: "pending" }, 202);

    await postInsightComputeByUserId("u2");

    const [, init] = lastFetchCall();
    expect(init?.body).toBe(JSON.stringify({}));
  });

  it("getInsightRuns GETs /insights/runs with pagination", async () => {
    mockFetchSuccess({ items: [{ run_day: "2026-09-17" }], total: 1 });

    const result = await getInsightRuns({ limit: 50, offset: 100 });
    expect(result.items).toEqual([{ run_day: "2026-09-17" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/runs?limit=50&offset=100");
    expect(init?.method).toBe("GET");
  });

  it("getInsightRuns omits the query when no page is asked for", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInsightRuns();

    const [url] = lastFetchCall();
    expect(url).toBe("/api/insights/runs");
  });

  it("getInsightsPending GETs /insights/pending", async () => {
    mockFetchSuccess({ students: ["u1", "u2"] });

    const result = await getInsightsPending();
    expect(result.students).toEqual(["u1", "u2"]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/pending");
    expect(init?.method).toBe("GET");
  });

  it("postInsightsRefresh POSTs /insights/refresh with the named students", async () => {
    mockFetchSuccess({ message_id: "m1", status: "pending" }, 202);

    await postInsightsRefresh({ user_ids: ["u1", "u2"], force: true });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/refresh");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_ids: ["u1", "u2"], force: true }));
  });

  it("postInsightsRefresh sends an empty body to fall back on the service's own list", async () => {
    mockFetchSuccess({ message_id: "m1", status: "pending" }, 202);

    await postInsightsRefresh();

    const [, init] = lastFetchCall();
    expect(init?.body).toBe(JSON.stringify({}));
  });

  it("postInsightRunReport POSTs the run day's own /report door", async () => {
    mockFetchSuccess({
      run_day: "2026-09-18",
      byte_size: 4096,
      truncated: false,
      notes: [],
      generated_at: 1_758_000_000_000,
    });

    const receipt = await postInsightRunReport("2026-09-18");
    expect(receipt.byte_size).toBe(4096);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/insights/runs/2026-09-18/report");
    expect(init?.method).toBe("POST");
  });

  it("insightRunReportUrl encodes the run day and getInsightRunReport reads those bytes back", async () => {
    expect(insightRunReportUrl("a/b")).toBe("/api/insights/runs/a%2Fb/report");
    const blob = new Blob(["<html>okul</html>"], { type: "text/html;charset=utf-8" });
    mockFetchBlob(blob);

    const bytes = await getInsightRunReport("2026-09-18");

    expect(await bytes.text()).toBe("<html>okul</html>");
    const [url, init] = lastFetchCall();
    // `blobClient` adds the `/api` the URL builder already carries for hrefs.
    expect(url).toBe("/api/insights/runs/2026-09-18/report");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("getInsightRunReport surfaces a 409 report_missing as an ApiError", async () => {
    mockFetchError(409, { error: "no school report is stored for this run day", code: "report_missing" });

    await expect(getInsightRunReport("2026-09-18")).rejects.toMatchObject({
      status: 409,
      message: "no school report is stored for this run day",
    });
  });
});
