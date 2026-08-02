import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deletePaymentPlanById,
  getMyPaymentBalance,
  getMyPaymentStatement,
  getPaymentBalanceByUserId,
  getPaymentLedgerByUserId,
  getPaymentPlanById,
  getPaymentPlans,
  getPaymentStatementByUserId,
  getPlanAssignments,
  patchPaymentPlanById,
  postPaymentCredit,
  postPaymentPlan,
  postPaymentRefund,
  postPaymentReversal,
  postPlanAssignment,
} from "../../payments";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("payments API", () => {
  afterEach(() => vi.restoreAllMocks());
  const json = () => mockFetchSuccess({});
  const page = () => mockFetchSuccess({ items: [], total: 0 });

  it("creates a fee plan", async () => {
    json();
    const body = { name: "2026-2027", installments: [{ amount_minor: 150000, due_at: 1_760_000_000_000 }] };
    await postPaymentPlan(body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/plans", { method: "POST", body: JSON.stringify(body) }]);
  });

  it("lists plans with pagination", async () => {
    page();
    await getPaymentPlans({ limit: 12, offset: 24 });
    expect(lastFetchCall()[0]).toBe("/api/payments/plans?limit=12&offset=24");
  });

  it("gets a plan by id", async () => {
    json();
    await getPaymentPlanById("p/1");
    expect(lastFetchCall()[0]).toBe("/api/payments/plans/p%2F1");
  });

  it("updates a plan", async () => {
    json();
    const body = { name: "renamed" };
    await patchPaymentPlanById("p1", body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/plans/p1", { method: "PATCH", body: JSON.stringify(body) }]);
  });

  it("deletes a plan", async () => {
    mockFetch204();
    await deletePaymentPlanById("p1");
    expect(lastFetchCall()).toMatchObject(["/api/payments/plans/p1", { method: "DELETE" }]);
  });

  it("assigns a plan to students", async () => {
    mockFetchSuccess([]);
    const body = { student_ids: ["s1", "s2"] };
    await postPlanAssignment("p1", body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/plans/p1/assignments", { method: "POST", body: JSON.stringify(body) }]);
  });

  it("lists plan assignments with pagination", async () => {
    page();
    await getPlanAssignments("p1", { limit: 5 });
    expect(lastFetchCall()[0]).toBe("/api/payments/plans/p1/assignments?limit=5");
  });

  it("records a payment with an idempotence key", async () => {
    json();
    const body = { charge_id: "c1", amount_minor: 50000, method: "havale", request_key: "receipt-2026-114" };
    await postPaymentCredit(body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/credits", { method: "POST", body: JSON.stringify(body) }]);
  });

  it("records a refund with an idempotence key", async () => {
    json();
    const body = { credit_id: "cr1", amount_minor: 50000, request_key: "refund-2026-114" };
    await postPaymentRefund(body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/refunds", { method: "POST", body: JSON.stringify(body) }]);
  });

  it("records a reversal", async () => {
    json();
    const body = { line_id: "l1", note: "billed in error" };
    await postPaymentReversal(body);
    expect(lastFetchCall()).toMatchObject(["/api/payments/reversals", { method: "POST", body: JSON.stringify(body) }]);
  });

  it("reads a student ledger with pagination", async () => {
    page();
    await getPaymentLedgerByUserId("u/1", { limit: 20, offset: 20 });
    expect(lastFetchCall()[0]).toBe("/api/payments/ledger/u%2F1?limit=20&offset=20");
  });

  it("reads my statement", async () => {
    mockFetchSuccess({ student: {}, entries: { items: [], total: 0 }, balance_minor: 0 });
    await getMyPaymentStatement({ limit: 10 });
    expect(lastFetchCall()[0]).toBe("/api/payments/statement/me?limit=10");
  });

  it("reads a student statement", async () => {
    mockFetchSuccess({ student: {}, entries: { items: [], total: 0 }, balance_minor: 0 });
    await getPaymentStatementByUserId("u1");
    expect(lastFetchCall()[0]).toBe("/api/payments/statement/u1");
  });

  it("reads my balance", async () => {
    mockFetchSuccess({ student: {}, balance_minor: 0 });
    await getMyPaymentBalance();
    expect(lastFetchCall()[0]).toBe("/api/payments/balance/me");
  });

  it("reads a student balance", async () => {
    mockFetchSuccess({ student: {}, balance_minor: 0 });
    await getPaymentBalanceByUserId("u1");
    expect(lastFetchCall()[0]).toBe("/api/payments/balance/u1");
  });
});
