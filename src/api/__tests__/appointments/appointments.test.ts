import { afterEach, describe, expect, it, vi } from "vitest";
import { postSlots } from "../../appointments";
import { getSlots } from "../../appointments";
import { deleteSlotById } from "../../appointments";
import { deleteSlotSeries } from "../../appointments";
import { postAppointment } from "../../appointments";
import { getAppointments } from "../../appointments";
import { patchApproveAppointment } from "../../appointments";
import { patchRejectAppointment } from "../../appointments";
import { patchCancelAppointment } from "../../appointments";
import { patchRescheduleAppointment } from "../../appointments";
import { patchAcceptReschedule } from "../../appointments";
import { patchDeclineReschedule } from "../../appointments";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("appointments API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postSlots calls /appointments/slots with data", async () => {
    const mockSlots = [{ id: "s1" }];
    mockFetchSuccess(mockSlots);

    const data = { starts_at: 1000, ends_at: 2000, note: "hi", repeat_weekly: true, until: 5000 };
    const result = await postSlots(data);
    expect(result).toEqual(mockSlots);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/slots");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getSlots calls /appointments/slots with pagination", async () => {
    const mockPage = { items: [{ id: "s1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getSlots({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/slots?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("deleteSlotById calls /appointments/slots/:id", async () => {
    mockFetch204();

    await deleteSlotById("s1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/slots/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteSlotSeries calls /appointments/slots/series/:series", async () => {
    mockFetch204();

    await deleteSlotSeries("ser1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/slots/series/ser1");
    expect(init?.method).toBe("DELETE");
  });

  it("postAppointment calls /appointments with data", async () => {
    const mockAppt = { id: "a1" };
    mockFetchSuccess(mockAppt);

    const data = { slot: "s1", reason: "need help" };
    const result = await postAppointment(data);
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getAppointments calls /appointments with pagination", async () => {
    const mockPage = { items: [{ id: "a1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getAppointments({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("patchApproveAppointment calls /appointments/:id/approve", async () => {
    const mockAppt = { id: "a1", status: "approved" };
    mockFetchSuccess(mockAppt);

    const result = await patchApproveAppointment("a1");
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/approve");
    expect(init?.method).toBe("PATCH");
  });

  it("patchRejectAppointment calls /appointments/:id/reject", async () => {
    const mockAppt = { id: "a1", status: "rejected" };
    mockFetchSuccess(mockAppt);

    const result = await patchRejectAppointment("a1");
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/reject");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBeUndefined();
  });

  it("patchRejectAppointment sends an optional reason body", async () => {
    mockFetchSuccess({ id: "a1", status: "rejected" });

    await patchRejectAppointment("a1", { reason: "slot no longer available" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/reject");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ reason: "slot no longer available" }));
  });

  it("patchCancelAppointment calls /appointments/:id/cancel", async () => {
    const mockAppt = { id: "a1", status: "cancelled" };
    mockFetchSuccess(mockAppt);

    const result = await patchCancelAppointment("a1");
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/cancel");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBeUndefined();
  });

  it("patchCancelAppointment sends an optional reason body", async () => {
    mockFetchSuccess({ id: "a1", status: "cancelled" });

    await patchCancelAppointment("a1", { reason: "double booked" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/cancel");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ reason: "double booked" }));
  });

  it("patchRescheduleAppointment calls /appointments/:id/reschedule with data", async () => {
    const mockAppt = { id: "a1" };
    mockFetchSuccess(mockAppt);

    const data = { starts_at: 3000, ends_at: 4000 };
    const result = await patchRescheduleAppointment("a1", data);
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/reschedule");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchAcceptReschedule calls /appointments/:id/reschedule/accept", async () => {
    const mockAppt = { id: "a1" };
    mockFetchSuccess(mockAppt);

    const body = { proposed_starts_at: 1000, proposed_ends_at: 2000 };
    const result = await patchAcceptReschedule("a1", body);
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/reschedule/accept");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("patchDeclineReschedule calls /appointments/:id/reschedule/decline", async () => {
    const mockAppt = { id: "a1" };
    mockFetchSuccess(mockAppt);

    const result = await patchDeclineReschedule("a1");
    expect(result).toEqual(mockAppt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/appointments/a1/reschedule/decline");
    expect(init?.method).toBe("PATCH");
  });
});
