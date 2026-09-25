import { afterEach, describe, expect, it, vi } from "vitest";
import { getMe } from "../../users";
import { patchMe } from "../../users";
import { getUsers } from "../../users";
import { getUserById } from "../../users";
import { getUserSearch } from "../../users";
import { patchUserProfile } from "../../users";
import { patchUserRole } from "../../users";
import { patchMyPreferences } from "../../users";
import { patchUserPreferences } from "../../users";
import { getMyProfile } from "../../users";
import { getUserProfile } from "../../users";
import { postMyAvatar } from "../../users";
import { deleteMyAvatar } from "../../users";
import { deleteUserAvatar } from "../../users";
import { getUserAvatarUrl } from "../../users";
import { postUser } from "../../users";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

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

  it("getUsers comma-joins multiple roles (manager tab = manager+admin)", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getUsers({ roles: ["manager", "admin"], limit: 200 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/users?limit=200&roles=manager%2Cadmin");
  });

  it("getUsers sends a single role unchanged", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getUsers({ roles: ["teacher"] });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/users?roles=teacher");
  });

  it("getUsers omits roles when the array is empty", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getUsers({ roles: [], limit: 5 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/users?limit=5");
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

  it("getUserById calls /users/:id", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const result = await getUserById("u1");
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1");
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

  it("patchMyPreferences sends palette_color to set the accent", async () => {
    const mockUser = { id: "u1", palette_color: "#fefae0" };
    mockFetchSuccess(mockUser);

    const updates = { palette_color: "#fefae0" };
    await patchMyPreferences(updates);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me/preferences");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("patchMyPreferences sends empty palette_color to clear the accent", async () => {
    const mockUser = { id: "u1", palette_color: null };
    mockFetchSuccess(mockUser);

    const updates = { palette_color: "" };
    await patchMyPreferences(updates);

    const [, init] = lastFetchCall();
    expect(init?.body).toBe(JSON.stringify({ palette_color: "" }));
  });

  it("patchUserPreferences calls /users/:id/preferences", async () => {
    const mockUser = { id: "u1", language: "tr" };
    mockFetchSuccess(mockUser);

    const updates = { language: "tr" as const };
    const result = await patchUserPreferences("u1", updates);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/preferences");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("getMyProfile calls /users/me/profile", async () => {
    const profile = { id: "u1", username: "test", badges: [] };
    mockFetchSuccess(profile);

    const result = await getMyProfile();
    expect(result).toEqual(profile);
    const [url] = lastFetchCall();
    expect(url).toBe("/api/users/me/profile");
  });

  it("getUserProfile calls /users/:id/profile", async () => {
    mockFetchSuccess({ id: "u2", username: "other", badges: [] });
    await getUserProfile("u2");
    const [url] = lastFetchCall();
    expect(url).toBe("/api/users/u2/profile");
  });

  it("postMyAvatar POSTs the file as multipart under the `file` field", async () => {
    mockFetchSuccess({ content_type: "image/png", size: 1024 }, 201);

    const file = new File(["x"], "me.png", { type: "image/png" });
    const result = await postMyAvatar(file);
    expect(result).toEqual({ content_type: "image/png", size: 1024 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me/avatar");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });

  it("deleteMyAvatar calls DELETE /users/me/avatar", async () => {
    mockFetch204();
    await deleteMyAvatar();
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/me/avatar");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteUserAvatar calls DELETE /users/:id/avatar", async () => {
    mockFetch204();
    await deleteUserAvatar("u2");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u2/avatar");
    expect(init?.method).toBe("DELETE");
  });

  it("getUserAvatarUrl builds a same-origin URL, with the cache-buster only when versioned", () => {
    expect(getUserAvatarUrl("u1")).toBe("/api/users/u1/avatar");
    expect(getUserAvatarUrl("u1", 3)).toBe("/api/users/u1/avatar?v=3");
    expect(getUserAvatarUrl("u/1")).toBe("/api/users/u%2F1/avatar");
  });
  it("postUser posts the new account to /users", async () => {
    const mockUser = { id: "u9", username: "ayse", role: "teacher" };
    mockFetchSuccess(mockUser);

    const body = { username: "ayse", password: "secret123", role: "teacher" as const };
    const result = await postUser(body);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(body);
  });

  it("postUser carries the school-issued student number", async () => {
    mockFetchSuccess({ id: "u9", username: "ayse", role: "student", student_number: "1234" });

    const body = { username: "ayse", password: "secret123", role: "student" as const, student_number: "1234" };
    await postUser(body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(body);
  });

  it("patchUserProfile sends an empty student number to clear it", async () => {
    mockFetchSuccess({ id: "u1", student_number: null });

    const updates = { student_number: "" };
    await patchUserProfile("u1", updates);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/users/u1/profile");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual(updates);
  });
});
