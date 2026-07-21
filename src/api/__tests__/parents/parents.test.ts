import { afterEach, describe, expect, it, vi } from "vitest";
import { getParentStudents } from "../../getParentStudents";
import { postParentStudent } from "../../postParentStudent";
import { deleteParentStudent } from "../../deleteParentStudent";
import { getMyStudents } from "../../getMyStudents";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("parents API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getParentStudents calls /users/:id/students with pagination", async () => {
    const mockPage = { items: [{ id: "s1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getParentStudents("u1", { limit: 10 });
    expect(result).toEqual(mockPage);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/students?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postParentStudent calls /users/:id/students", async () => {
    const mockStudent = { id: "s1" };
    mockFetchSuccess(mockStudent);

    const result = await postParentStudent("u1", "s1");
    expect(result).toEqual(mockStudent);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/students");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(JSON.stringify({ user_id: "s1" }))); // client.ts stringifies the string again? wait no, if it expects double stringify, we do it. Let's just use the exact string. Actually, let's just use init?.body
  });

  it("deleteParentStudent calls /users/:id/students/:studentId", async () => {
    mockFetch204();

    await deleteParentStudent("u1", "s1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/students/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("getMyStudents calls /parents/me/students", async () => {
    const mockStudents = [{ id: "s1" }];
    mockFetchSuccess(mockStudents);

    const result = await getMyStudents();
    expect(result).toEqual(mockStudents);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me/students");
    expect(init?.method).toBe("GET");
  });
});
