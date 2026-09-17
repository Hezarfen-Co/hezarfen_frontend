import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiCapabilities, getBridgeCertificate } from "../../ai";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";
describe("ai API", () => {
  afterEach(() => vi.restoreAllMocks());
  it("gets the bridge certificate", async () => {
    mockFetchSuccess({ protocol: "hab/1", certificate_pem: "pem", fingerprint_sha256: "hash" });
    await getBridgeCertificate();
    expect(lastFetchCall()[0]).toBe("/api/ai/certificate");
  });
  it("gets the bridge capabilities", async () => {
    mockFetchSuccess({ enabled: true, protocol: "hab/2", capabilities: [] });
    const result = await getAiCapabilities();
    expect(result.protocol).toBe("hab/2");
    expect(lastFetchCall()[0]).toBe("/api/ai/capabilities");
  });
});
