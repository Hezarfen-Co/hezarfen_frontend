import { api, contractBaseUrl, expectPage, isLive, json, loginAdmin, SKIP_MESSAGE } from "./helpers/live-client";

if (!isLive) console.warn(SKIP_MESSAGE);

describe.skipIf(!isLive)(`core contract @ ${contractBaseUrl}`, () => {
  beforeAll(loginAdmin);

  it("keeps the authenticated user DTO stable", async () => {
    const me = await json<Record<string, unknown>>("/auth/me");
    expect(typeof me.id).toBe("string");
    expect(typeof me.username).toBe("string");
    expect(["student", "parent", "teacher", "manager", "admin"]).toContain(me.role);
  });

  it("exposes the limits document used by client validation", async () => {
    const limits = await json<Record<string, Record<string, unknown>>>("/limits");
    expect(typeof limits.user?.max_username_len).toBe("number");
    expect(typeof limits.note?.max_files).toBe("number");
    expect(typeof limits.request?.max_page_limit).toBe("number");
  });

  it("uses the documented page envelope on administrative list routes", async () => {
    for (const path of ["/users?limit=1", "/appointments?limit=1", "/payments/plans?limit=1"]) {
      expectPage(await json(path));
    }
  });

  it("rejects anonymous protected reads", async () => {
    // This raw request deliberately has no cookie, independent of the suite's jar.
    const response = await fetch(`${contractBaseUrl}/auth/me`, { signal: AbortSignal.timeout(10_000) });
    expect(response.status).toBe(401);
  });
});
