import { afterEach, describe, expect, it, vi } from "vitest";
import { postLogin } from "../../auth";
import { postLogout } from "../../auth";
import { postRegister } from "../../auth";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("auth API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postLogin calls /auth/login with credentials", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const result = await postLogin({ school: "demo", username: "test", password: "password" });
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ school: "demo", username: "test", password: "password" }));
  });

  it("postLogout calls /auth/logout", async () => {
    mockFetch204();

    await postLogout();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/logout");
    expect(init?.method).toBe("POST");
  });

  it("postRegister calls /auth/register with data", async () => {
    const mockUser = { id: "u2", username: "newuser" };
    mockFetchSuccess(mockUser);

    const data = { school: "demo", username: "newuser", password: "password", email: "test@test.com" };
    const result = await postRegister(data);
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/register");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });
});
