import { afterEach, describe, expect, it, vi } from "vitest";
import { getEvents } from "../../events";
import { getEventById } from "../../events";
import { postEvent } from "../../events";
import { patchEventById } from "../../events";
import { deleteEventById } from "../../events";
import { getEventAttendance } from "../../events";
import { postEventAttendance } from "../../events";
import { getEventRoster } from "../../events";
import { postEventRegister } from "../../events";
import { deleteEventRegisterByUserId } from "../../events";
import { deleteEventAttendanceByUserId } from "../../events";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("events API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getEvents calls /events with pagination", async () => {
    const mockPage = { items: [{ id: "e1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getEvents({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getEventById calls /events/:id", async () => {
    const mockEvent = { id: "e1", title: "Event" };
    mockFetchSuccess(mockEvent);

    const result = await getEventById("e1");
    expect(result).toEqual(mockEvent);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1");
    expect(init?.method).toBe("GET");
  });

  it("postEvent calls /events with data", async () => {
    const mockEvent = { id: "e1" };
    mockFetchSuccess(mockEvent);

    const data = { title: "New Event", description: "Desc", audience: { kind: "school" as const } };
    const result = await postEvent(data);
    expect(result).toEqual(mockEvent);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchEventById calls /events/:id with updates", async () => {
    const mockEvent = { id: "e1", title: "Updated" };
    mockFetchSuccess(mockEvent);

    const updates = { title: "Updated" };
    const result = await patchEventById("e1", updates);
    expect(result).toEqual(mockEvent);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteEventById calls /events/:id", async () => {
    mockFetch204();

    await deleteEventById("e1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1");
    expect(init?.method).toBe("DELETE");
  });

  it("getEventAttendance calls /events/:id/attendance", async () => {
    const mockPage = { items: [{ id: "a1", status: "present" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getEventAttendance("e1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/attendance");
    expect(init?.method).toBe("GET");
  });

  it("postEventAttendance calls /events/:id/attendance", async () => {
    const mockAtt = { id: "a1", status: "present" };
    mockFetchSuccess(mockAtt);

    const data = { user_id: "u1", status: "present" };
    const result = await postEventAttendance("e1", data);
    expect(result).toEqual(mockAtt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/attendance");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getEventRoster calls /events/:id/roster", async () => {
    const mockPage = { items: [{ user: { id: "u1" }, status: "present" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getEventRoster("e1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/roster");
    expect(init?.method).toBe("GET");
  });

  it("postEventRegister calls /events/:id/register", async () => {
    const mockReg = { event: "e1", user: { id: "u1" } };
    mockFetchSuccess(mockReg);

    const data = { user_id: "u1" };
    const result = await postEventRegister("e1", data);
    expect(result).toEqual(mockReg);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/register");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("deleteEventRegisterByUserId calls /events/:id/register/:userId", async () => {
    mockFetch204();

    await deleteEventRegisterByUserId("e1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/register/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteEventAttendanceByUserId calls /events/:id/attendance/:userId", async () => {
    mockFetch204();

    await deleteEventAttendanceByUserId("e1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/events/e1/attendance/u1");
    expect(init?.method).toBe("DELETE");
  });
});
