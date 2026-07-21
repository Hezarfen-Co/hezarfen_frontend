import { afterEach, describe, expect, it, vi } from "vitest";
import { patchSessionById } from "../../patchSessionById";
import { deleteSessionById } from "../../deleteSessionById";
import { getSessionAttendance } from "../../getSessionAttendance";
import { postSessionAttendance } from "../../postSessionAttendance";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("sessions API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
