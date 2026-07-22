import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionById } from "../../sessions";
import { patchSessionById } from "../../sessions";
import { deleteSessionById } from "../../sessions";
import { getSessionAttendance } from "../../sessions";
import { postSessionAttendance } from "../../sessions";
import { deleteSessionAttendanceByUserId } from "../../sessions";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("sessions API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getSessionById calls /sessions/:id", async () => {
    const mockSession = { id: "s1", topic: "Topic" };
    mockFetchSuccess(mockSession);

    const result = await getSessionById("s1");
    expect(result).toEqual(mockSession);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1");
    expect(init?.method).toBe("GET");
  });

  it("patchSessionById calls /sessions/:id with updates", async () => {
    const mockSession = { id: "s1", topic: "Updated" };
    mockFetchSuccess(mockSession);

    const updates = { topic: "Updated" };
    const result = await patchSessionById("s1", updates);
    expect(result).toEqual(mockSession);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteSessionById calls /sessions/:id", async () => {
    mockFetch204();

    await deleteSessionById("s1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("getSessionAttendance calls /sessions/:id/attendance", async () => {
    const mockPage = { items: [{ id: "a1", status: "present" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getSessionAttendance("s1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1/attendance");
    expect(init?.method).toBe("GET");
  });

  it("postSessionAttendance calls /sessions/:id/attendance", async () => {
    const mockAtt = { id: "a1", status: "present" };
    mockFetchSuccess(mockAtt);

    const data = { user_id: "u1", status: "present" };
    const result = await postSessionAttendance("s1", data);
    expect(result).toEqual(mockAtt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1/attendance");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("deleteSessionAttendanceByUserId calls /sessions/:id/attendance/:user", async () => {
    mockFetch204();

    await deleteSessionAttendanceByUserId("s1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/sessions/s1/attendance/u1");
    expect(init?.method).toBe("DELETE");
  });
});
