import { afterEach, describe, expect, it, vi } from "vitest";
import { getModules } from "../../modules";
import { getModulesCatalog } from "../../modules";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("modules API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getModules calls /modules", async () => {
    const mockModules = { enabled: ["courses", "meals"] };
    mockFetchSuccess(mockModules);

    const result = await getModules();
    expect(result).toEqual(mockModules);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/modules");
    expect(init?.method).toBe("GET");
  });

  it("getModulesCatalog calls /modules/catalog", async () => {
    const mockCatalog = {
      modules: [{ module: "exams", package: "academics", requires: ["courses"] }],
      packages: [{ package: "academics", modules: ["exams"] }],
    };
    mockFetchSuccess(mockCatalog);

    const result = await getModulesCatalog();
    expect(result).toEqual(mockCatalog);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/modules/catalog");
    expect(init?.method).toBe("GET");
  });
});
