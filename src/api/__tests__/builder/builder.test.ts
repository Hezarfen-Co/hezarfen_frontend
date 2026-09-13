import { afterEach, describe, expect, it, vi } from "vitest";
import { getBuilderMe } from "../../builder";
import { postBuilderLogin } from "../../builder";
import { postBuilderLogout } from "../../builder";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("builder API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postBuilderLogin posts credentials to /builder/login", async () => {
    const builder = { id: "b1", username: "operator" };
    mockFetchSuccess(builder);

    const result = await postBuilderLogin({ username: "operator", password: "correct horse" });
    expect(result).toEqual(builder);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/builder/login");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "operator", password: "correct horse" }));
  });

  it("postBuilderLogout posts to /builder/logout", async () => {
    mockFetch204();

    await postBuilderLogout();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/builder/logout");
    expect(init?.method).toBe("POST");
  });

  it("getBuilderMe reads /builder/me", async () => {
    mockFetchSuccess({ id: "b1", username: "operator" });

    await getBuilderMe();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/builder/me");
    expect(init?.method).toBe("GET");
  });
});
