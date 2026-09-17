import { afterEach, describe, expect, it, vi } from "vitest";
import {
  postClass,
  getClasses,
  getClassById,
  getMyClasses,
  getClassesByUserId,
  patchClassById,
  deleteClassById,
  postClassMember,
  getClassMembers,
  deleteClassMember,
  postClassInstance,
  getClassInstances,
  deleteClassInstance,
  postClassBlueprint,
  getClassBlueprints,
  getClassBlueprintByGrade,
  patchClassBlueprintByGrade,
  deleteClassBlueprintByGrade,
  postClassBlueprintApply,
  getClassBlueprintStatus,
} from "../../classes";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("classes API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postClass POSTs /classes with the body", async () => {
    mockFetchSuccess({ id: "c1" });
    const body = { name: "9-A", grade: "9", term_id: "t1" };
    await postClass(body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClasses GETs /classes with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "c1" }], total: 1 });
    await getClasses({ limit: 5, offset: 10 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes?limit=5&offset=10");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("getClassById GETs /classes/:id", async () => {
    mockFetchSuccess({ id: "c1" });
    await getClassById("c1");
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
  });

  it("getMyClasses GETs /classes/me with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "c1" }], total: 1 });
    await getMyClasses({ limit: 5, offset: 10 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/me?limit=5&offset=10");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("getClassesByUserId GETs /classes/user/:id with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "c1" }], total: 1 });
    await getClassesByUserId("u1", { limit: 5, offset: 10 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/user/u1?limit=5&offset=10");
  });

  it("patchClassById PATCHes /classes/:id with the body", async () => {
    mockFetchSuccess({ id: "c1" });
    const body = { name: "9-B", grade: null, term_id: null };
    await patchClassById("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteClassById DELETEs /classes/:id", async () => {
    mockFetch204();
    await deleteClassById("c1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassMember POSTs /classes/:id/members with the body", async () => {
    mockFetchSuccess({ id: "m1" });
    const body = { user_id: "u1" };
    await postClassMember("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClassMembers GETs /classes/:id/members with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getClassMembers("c1", { limit: 5, offset: 10 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members?limit=5&offset=10");
  });

  it("deleteClassMember DELETEs /classes/:id/members/:user", async () => {
    mockFetch204();
    await deleteClassMember("c1", "u1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassInstance POSTs /classes/:id/instances with the body", async () => {
    mockFetchSuccess({ id: "cc1" });
    const body = { course_id: "co1" };
    await postClassInstance("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/instances");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClassInstances GETs /classes/:id/instances with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getClassInstances("c1", { limit: 5, offset: 10 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/instances?limit=5&offset=10");
  });

  // The second segment is the instance id, not the course id — two şubeler
  // teaching the same course hold two instances.
  it("deleteClassInstance DELETEs /classes/:id/instances/:instance", async () => {
    mockFetch204();
    await deleteClassInstance("c1", "i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/instances/i1");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassBlueprint POSTs /classes/blueprints with the body", async () => {
    mockFetchSuccess({ blueprint: { grade: "9", courses: [], creator: {} }, skipped: [] });
    const body = { grade: "9", course_ids: ["co1", "co2"] };
    await postClassBlueprint(body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClassBlueprints GETs /classes/blueprints with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getClassBlueprints({ limit: 20, offset: 40 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints?limit=20&offset=40");
  });

  it("getClassBlueprintByGrade encodes the grade, which is the record key", async () => {
    mockFetchSuccess({ grade: "9/A", courses: [], creator: {} });
    await getClassBlueprintByGrade("9/A");
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints/9%2FA");
  });

  it("patchClassBlueprintByGrade PATCHes the whole course set", async () => {
    mockFetchSuccess({ blueprint: { grade: "9", courses: [], creator: {} }, skipped: [] });
    const body = { course_ids: ["co1"] };
    await patchClassBlueprintByGrade("9", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints/9");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteClassBlueprintByGrade DELETEs /classes/blueprints/:grade", async () => {
    mockFetch204();
    await deleteClassBlueprintByGrade("9/A");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints/9%2FA");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassBlueprintApply POSTs /classes/:id/blueprint with no body", async () => {
    mockFetchSuccess({ skipped: [] });
    await postClassBlueprintApply("c1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/blueprint");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });

  it("getClassBlueprintStatus GETs /classes/blueprints/:grade/status", async () => {
    const mockStatus = { grade: "9/A", courses: ["co1"], matched: 3, sections: [] };
    mockFetchSuccess(mockStatus);
    const result = await getClassBlueprintStatus("9/A");
    expect(result).toEqual(mockStatus);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/blueprints/9%2FA/status");
    expect(init?.method).toBe("GET");
  });
});
