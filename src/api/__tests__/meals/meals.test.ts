import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteMealBookingById,
  deleteMealDishById,
  deleteMealMenuById,
  getDietaryProfileByUserId,
  getMealAttendanceByUserId,
  getMealBalanceByUserId,
  getMealLedgerByUserId,
  getMealMenuBookings,
  getMealMenuAttendance,
  getMealMenuById,
  getMealMenus,
  getMyDietaryProfile,
  getMyMealBalance,
  getMyMealBookings,
  patchDietaryProfileByUserId,
  patchMealDishById,
  patchMealMenuById,
  postMealAttendance,
  postMealBooking,
  postMealCredit,
  postMealDish,
  postMealMenu,
} from "../../meals";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("meals API", () => {
  afterEach(() => vi.restoreAllMocks());
  const json = () => mockFetchSuccess({});
  const page = () => mockFetchSuccess({ items: [], total: 0 });

  it("lists menus with dates, slot, and pagination", async () => {
    page(); await getMealMenus({ from: "2026-07-28", to: "2026-08-01", slot: "lunch", limit: 12, offset: 12 });
    expect(lastFetchCall()[0]).toBe("/api/meals/menus?limit=12&offset=12&from=2026-07-28&to=2026-08-01&slot=lunch");
  });
  it("omits the slot key for the all pseudo-option, blank, and unset", async () => {
    page(); await getMealMenus({ slot: "all", limit: 5 });
    expect(lastFetchCall()[0]).toBe("/api/meals/menus?limit=5");
    page(); await getMealMenus({ slot: "   " });
    expect(lastFetchCall()[0]).toBe("/api/meals/menus");
    page(); await getMealMenus();
    expect(lastFetchCall()[0]).toBe("/api/meals/menus");
  });
  it("gets a menu", async () => { json(); await getMealMenuById("m/1"); expect(lastFetchCall()[0]).toBe("/api/meals/menus/m%2F1"); });
  it("publishes a menu", async () => {
    json(); const body = { date: "2026-07-28", slot: "lunch", capacity: 10 }; await postMealMenu(body);
    expect(lastFetchCall()).toMatchObject(["/api/meals/menus", { method: "POST", body: JSON.stringify(body) }]);
  });
  it("patches a menu", async () => {
    json(); await patchMealMenuById("m1", { capacity: null });
    expect(lastFetchCall()).toMatchObject(["/api/meals/menus/m1", { method: "PATCH", body: JSON.stringify({ capacity: null }) }]);
  });
  it("deletes a menu", async () => { mockFetch204(); await deleteMealMenuById("m1"); expect(lastFetchCall()).toMatchObject(["/api/meals/menus/m1", { method: "DELETE" }]); });
  it("adds a dish", async () => {
    json(); const body = { name: "Soup", description: null, price_minor: 4500, tags: ["vegan"] }; await postMealDish("m1", body);
    expect(lastFetchCall()).toMatchObject(["/api/meals/menus/m1/dishes", { method: "POST", body: JSON.stringify(body) }]);
  });
  it("patches a dish", async () => { json(); await patchMealDishById("d1", { price_minor: 5000 }); expect(lastFetchCall()).toMatchObject(["/api/meals/dishes/d1", { method: "PATCH", body: JSON.stringify({ price_minor: 5000 }) }]); });
  it("deletes a dish", async () => { mockFetch204(); await deleteMealDishById("d1"); expect(lastFetchCall()).toMatchObject(["/api/meals/dishes/d1", { method: "DELETE" }]); });
  it("gets own profile", async () => { json(); await getMyDietaryProfile(); expect(lastFetchCall()[0]).toBe("/api/meals/profiles/me"); });
  it("gets a student profile", async () => { json(); await getDietaryProfileByUserId("u1"); expect(lastFetchCall()[0]).toBe("/api/meals/profiles/u1"); });
  it("patches a student profile", async () => {
    json(); const body = { tags: ["nuts"], note: null }; await patchDietaryProfileByUserId("u1", body);
    expect(lastFetchCall()).toMatchObject(["/api/meals/profiles/u1", { method: "PATCH", body: JSON.stringify(body) }]);
  });
  it("books a child seat", async () => {
    json(); await postMealBooking("m1", "u1");
    expect(lastFetchCall()).toMatchObject(["/api/meals/menus/m1/bookings", { method: "POST", body: JSON.stringify({ student_id: "u1" }) }]);
  });
  it("lists own bookings", async () => { page(); await getMyMealBookings({ limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/meals/bookings/me?limit=20"); });
  it("cancels a booking", async () => { json(); await deleteMealBookingById("b1"); expect(lastFetchCall()).toMatchObject(["/api/meals/bookings/b1", { method: "DELETE" }]); });
  it("lists booking audit", async () => { page(); await getMealMenuBookings("m1", { limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/meals/menus/m1/bookings?limit=20"); });
  it("lists menu attendance", async () => { page(); await getMealMenuAttendance("m1", { limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/meals/menus/m1/attendance?limit=20"); });
  it("marks service", async () => {
    json(); await postMealAttendance("m1", "u1", "served");
    expect(lastFetchCall()).toMatchObject(["/api/meals/menus/m1/attendance", { method: "POST", body: JSON.stringify({ student_id: "u1", status: "served" }) }]);
  });
  it("gets attendance history", async () => { page(); await getMealAttendanceByUserId("u1", { from: "2026-07-01", limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/meals/attendance/u1?limit=20&from=2026-07-01"); });
  it("gets own balance", async () => { json(); await getMyMealBalance(); expect(lastFetchCall()[0]).toBe("/api/meals/balance/me"); });
  it("gets student balance", async () => { json(); await getMealBalanceByUserId("u1"); expect(lastFetchCall()[0]).toBe("/api/meals/balance/u1"); });
  it("gets student ledger", async () => { page(); await getMealLedgerByUserId("u1", { limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/meals/ledger/u1?limit=20"); });
  it("records append-only credit", async () => {
    json(); const body = { student_id: "u1", amount_minor: 10000, method: "cash", note: "receipt" }; await postMealCredit(body);
    expect(lastFetchCall()).toMatchObject(["/api/meals/credits", { method: "POST", body: JSON.stringify(body) }]);
  });
});
