import { afterEach, describe, expect, it, vi } from "vitest";
import { getMe } from "../../users";
import { patchMe } from "../../users";
import { getUsers } from "../../users";
import { getUserSearch } from "../../users";
import { patchUserProfile } from "../../users";
import { patchUserRole } from "../../users";
import { patchMyPreferences } from "../../users";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("users API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMe calls /users/me", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const result = await getMe();
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/me");
    expect(init?.method).toBe("GET");
  });

  it("patchMe calls /users/me with updates", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const updates = { name: "New Name" };
    const result = await patchMe(updates);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("getUsers calls /users with pagination", async () => {
    const mockPage = { items: [{ id: "u1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getUsers({ limit: 10, offset: 20 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 }); // Normalized

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users?limit=10&offset=20");
    expect(init?.method).toBe("GET");
  });

  it("getUserSearch calls /users/search with query, role, and pagination", async () => {
    const mockPage = { items: [{ id: "u1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getUserSearch("john", undefined, "student", { limit: 5 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 }); // Normalized

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/search?q=john&role=student&limit=5");
    expect(init?.method).toBe("GET");
  });

  it("patchUserProfile calls /users/:id/profile", async () => {
    const mockUser = { id: "u1", name: "Updated" };
    mockFetchSuccess(mockUser);

    const updates = { name: "Updated" };
    const result = await patchUserProfile("u1", updates);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/profile");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("patchUserRole calls /users/:id/role", async () => {
    const mockUser = { id: "u1", role: "teacher" };
    mockFetchSuccess(mockUser);

    const result = await patchUserRole("u1", "teacher");
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/role");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ role: "teacher" }));
  });

  it("patchMyPreferences calls /users/me/preferences", async () => {
    const mockUser = { id: "u1", theme: "dark" };
    mockFetchSuccess(mockUser);

    const updates = { theme: "dark" as const };
    const result = await patchMyPreferences(updates);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me/preferences");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });
});
