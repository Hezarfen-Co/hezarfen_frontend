import { afterEach, describe, expect, it, vi } from "vitest";
import { getBridgeCertificate } from "../../ai";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";
describe("ai API", () => {
  afterEach(() => vi.restoreAllMocks());
  it("gets the bridge certificate", async () => {
    mockFetchSuccess({ protocol: "hab/1", certificate_pem: "pem", fingerprint_sha256: "hash" });
    await getBridgeCertificate();
    expect(lastFetchCall()[0]).toBe("/api/ai/certificate");
  });
});
