import { afterEach, describe, expect, it, vi } from "vitest";
import { getRegisterSchools } from "../../auth";
import { postLogin } from "../../auth";
import { postLogout } from "../../auth";
import { postRegister } from "../../auth";
import { postSelectSchool } from "../../auth";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("auth API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postLogin calls /auth/login with credentials", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const result = await postLogin({ username: "test", password: "password" });
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "test", password: "password" }));
  });

  it("postSelectSchool binds the person session to a school", async () => {
    const mockUser = { id: "u1", username: "test" };
    mockFetchSuccess(mockUser);

    const school = "019732e3-7b00-7000-8000-00000000dead";
    const result = await postSelectSchool({ school });
    expect(result).toEqual(mockUser);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/school");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ school }));
  });

  it("postLogout calls /auth/logout", async () => {
    mockFetch204();

    await postLogout();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/logout");
    expect(init?.method).toBe("POST");
  });

  it("postRegister calls /auth/register with data", async () => {
    const mockResponse = { username: "newuser", role: "student" };
    mockFetchSuccess(mockResponse);

    const data = { school: "019732e3-7b00-7000-8000-00000000dead", username: "newuser", password: "password" };
    const result = await postRegister(data);
    expect(result).toEqual(mockResponse);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/register");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getRegisterSchools reads active schools for the register picker", async () => {
    const schools = [{ id: "019732e3-7b00-7000-8000-00000000dead", name: "Hezarfen" }];
    mockFetchSuccess(schools);

    const result = await getRegisterSchools();
    expect(result).toEqual(schools);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/auth/schools");
    expect(init?.method).toBe("GET");
  });
});
