import { api, contractBaseUrl, expectPage, isLive, json, loginAdmin, SKIP_MESSAGE } from "./helpers/live-client";

if (!isLive) console.warn(SKIP_MESSAGE);

// The insights and podcast doors stand in front of an AI service the scratch
// backend does not have to be running. So every assertion here is written to
// hold in both worlds: the reads answer their DTO either way (they only serve
// stored rows), and the detached writes are allowed to answer 503 — what they
// may never do is 500, or invent a receipt they did not queue.
describe.skipIf(!isLive)(`ai contract @ ${contractBaseUrl}`, () => {
  beforeAll(loginAdmin);

  it("answers the caller's own insight with every section present", async () => {
    const insight = await json<Record<string, unknown>>("/insights/me");
    expect(typeof insight.user_id).toBe("string");
    // Arrays, never null: an absent section and an empty one are different
    // claims, and the client renders them differently.
    expect(Array.isArray(insight.attention)).toBe(true);
    expect(Array.isArray(insight.cards)).toBe(true);
    expect(Array.isArray(insight.segments)).toBe(true);
    // `summary` is null until ZEKA has computed this caller at least once.
    expect(insight.summary === null || typeof insight.summary === "object").toBe(true);
  });

  it("pages the run ledger for a manager+ caller", async () => {
    expectPage(await json("/insights/runs?limit=1"));
  });

  it("keeps a run row's counters and pending list on the documented shape", async () => {
    const page = await json<{ items: Record<string, unknown>[] }>("/insights/runs?limit=1");
    const run = page.items[0];
    if (!run) return; // A backend that has never swept has no row to check.
    expect(typeof run.run_day).toBe("string");
    expect(["running", "ok", "partial", "failed", "skipped"]).toContain(run.status);
    expect(typeof run.students_total).toBe("number");
    expect(typeof run.budget_exceeded).toBe("boolean");
    expect(Array.isArray(run.pending_students)).toBe(true);
    expect(Array.isArray(run.failed_modules)).toBe(true);
  });

  it("either queues a school-wide recompute or refuses it for want of a service", async () => {
    const response = await api("/insights/refresh", { method: "POST", body: {} });
    expect([202, 503]).toContain(response.status);
    if (response.status === 202) {
      // Documented receipt is `{status: "accepted"}` only: the work's own
      // record is ZEKA's (zeka_run), so no message row id is minted here.
      const receipt = (await response.json()) as Record<string, unknown>;
      expect(receipt.status).toBe("accepted");
    }
  });

  it("refuses a podcast job for an unknown source without pretending to queue it", async () => {
    const response = await api("/podcast/jobs", {
      method: "POST",
      body: { source_id: "00000000-0000-0000-0000-000000000000" },
    });
    // 503 with no service, 400/404 for a malformed or unresolvable id, and the
    // backend's documented 409 `source_missing` when the note has no narratable
    // PDF on this host (a nonexistent note lands there too, by design). A 202
    // here would mean the backend minted a job for nothing.
    expect([400, 404, 409, 503]).toContain(response.status);
  });

  it("answers nothing for an audio job id that is not the caller's", async () => {
    // The stream is addressed by job id and resolved from the caller's own job
    // row, so a caller cannot name a file at all — an unknown id is a 404, and
    // never bytes. (The old `?path=` door, which took a client-supplied path
    // and answered 400 on escape, is gone.)
    const response = await api(`/podcast/jobs/${encodeURIComponent("00000000-0000-0000-0000-000000000000")}/audio`);
    expect([404, 503]).toContain(response.status);
  });
});
