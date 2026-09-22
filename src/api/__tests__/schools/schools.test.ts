import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteSchool } from "../../schools";
import { deleteSchoolModule } from "../../schools";
import { getSchool } from "../../schools";
import { getSchoolModules } from "../../schools";
import { getSchools } from "../../schools";
import { patchSchool } from "../../schools";
import { patchSchoolModules } from "../../schools";
import { postSchool } from "../../schools";
import { postSchoolAdminPassword } from "../../schools";
import { postSchoolEnter } from "../../schools";
import { postSchoolModule } from "../../schools";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

const schoolId = "019732e3-7b00-7000-8000-00000000dead";
const school = { id: schoolId, name: "Ata Koleji", status: "active", created_at: 1, modules: ["courses"] };
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

  it("getSchool reads /schools/{id}", async () => {
    mockFetchSuccess(school);

    await getSchool(schoolId);

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}`);
    expect(init?.method).toBe("GET");
  });

  it("postSchool posts the school and its first admin", async () => {
    mockFetchSuccess(school, 201);
    const body = { name: "Ata Koleji", admin_username: "admin", admin_password: "secret123", modules: ["courses"] };

    await postSchool(body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/schools");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("patchSchool patches name and status", async () => {
    mockFetchSuccess({ ...school, status: "suspended" });

    await patchSchool(schoolId, { status: "suspended" });

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}`);
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ status: "suspended" }));
  });

  it("deleteSchool deletes /schools/{id}", async () => {
    mockFetch204();

    await deleteSchool(schoolId);

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}`);
    expect(init?.method).toBe("DELETE");
  });

  it("postSchoolAdminPassword re-keys an admin", async () => {
    mockFetch204();

    await postSchoolAdminPassword(schoolId, { username: "admin", password: "newsecret" });

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/admin-password`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "admin", password: "newsecret" }));
  });

  it("postSchoolEnter enters as a named admin", async () => {
    mockFetchSuccess({ id: "u1", username: "admin", role: "admin" });

    await postSchoolEnter(schoolId, { username: "admin" });

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/enter`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ username: "admin" }));
  });

  it("getSchoolModules reads both halves of the catalog", async () => {
    mockFetchSuccess(modules);

    const result = await getSchoolModules(schoolId);
    expect(result).toEqual(modules);

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/modules`);
    expect(init?.method).toBe("GET");
  });

  it("patchSchoolModules re-sells the shelf in one write", async () => {
    mockFetchSuccess(modules);
    const body = { enable: ["exams"], disable_packages: ["ai"] };

    await patchSchoolModules(schoolId, body);

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/modules`);
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("postSchoolModule enables one module", async () => {
    mockFetchSuccess(modules);

    await postSchoolModule(schoolId, "exams");

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/modules/exams`);
    expect(init?.method).toBe("POST");
  });

  it("deleteSchoolModule disables one module", async () => {
    mockFetchSuccess(modules);

    await deleteSchoolModule(schoolId, "exams");

    const [url, init] = lastFetchCall();
    expect(url).toBe(`/api/schools/${schoolId}/modules/exams`);
    expect(init?.method).toBe("DELETE");
  });
});
