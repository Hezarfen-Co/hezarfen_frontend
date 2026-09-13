import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteSchoolBySlug } from "../../schools";
import { deleteSchoolModule } from "../../schools";
import { getSchoolBySlug } from "../../schools";
import { getSchoolModules } from "../../schools";
import { getSchools } from "../../schools";
import { patchSchoolBySlug } from "../../schools";
import { patchSchoolModules } from "../../schools";
import { postSchool } from "../../schools";
import { postSchoolAdminPassword } from "../../schools";
import { postSchoolEnter } from "../../schools";
import { postSchoolModule } from "../../schools";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

const school = { slug: "ata-koleji", name: "Ata Koleji", status: "active", created_at: 1, modules: ["courses"] };
const modules = { enabled: ["courses"], disabled: ["exams"] };

describe("schools API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getSchools pages /schools", async () => {
    mockFetchSuccess({ items: [school], total: 1, limit: 20, offset: 0 });

    const result = await getSchools({ limit: 20, offset: 0 });
    expect(result.items).toEqual([school]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools?limit=20&offset=0");
    expect(init?.method).toBe("GET");
  });

  it("getSchoolBySlug reads /schools/{slug}", async () => {
    mockFetchSuccess(school);

    await getSchoolBySlug("ata-koleji");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji");
    expect(init?.method).toBe("GET");
  });

  it("postSchool posts the school and its first admin", async () => {
    mockFetchSuccess(school, 201);
    const body = { slug: "ata-koleji", name: "Ata Koleji", admin_username: "admin", admin_password: "secret123", modules: ["courses"] };

    await postSchool(body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("patchSchoolBySlug patches name and status", async () => {
    mockFetchSuccess({ ...school, status: "suspended" });

    await patchSchoolBySlug("ata-koleji", { status: "suspended" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ status: "suspended" }));
  });

  it("deleteSchoolBySlug deletes /schools/{slug}", async () => {
    mockFetch204();

    await deleteSchoolBySlug("ata-koleji");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji");
    expect(init?.method).toBe("DELETE");
  });

  it("postSchoolAdminPassword re-keys an admin", async () => {
    mockFetch204();

    await postSchoolAdminPassword("ata-koleji", { username: "admin", password: "newsecret" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/admin-password");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "admin", password: "newsecret" }));
  });

  it("postSchoolEnter enters as a named admin", async () => {
    mockFetchSuccess({ id: "u1", username: "admin", role: "admin" });

    await postSchoolEnter("ata-koleji", { username: "admin" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/enter");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "admin" }));
  });

  it("getSchoolModules reads both halves of the catalog", async () => {
    mockFetchSuccess(modules);

    const result = await getSchoolModules("ata-koleji");
    expect(result).toEqual(modules);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/modules");
    expect(init?.method).toBe("GET");
  });

  it("patchSchoolModules re-sells the shelf in one write", async () => {
    mockFetchSuccess(modules);
    const body = { enable: ["exams"], disable_packages: ["ai"] };

    await patchSchoolModules("ata-koleji", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/modules");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("postSchoolModule enables one module", async () => {
    mockFetchSuccess(modules);

    await postSchoolModule("ata-koleji", "exams");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/modules/exams");
    expect(init?.method).toBe("POST");
  });

  it("deleteSchoolModule disables one module", async () => {
    mockFetchSuccess(modules);

    await deleteSchoolModule("ata-koleji", "exams");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools/ata-koleji/modules/exams");
    expect(init?.method).toBe("DELETE");
  });
});
