import { afterEach, describe, expect, test, vi } from "vitest";
import type { ClassGroup, ClassMember, PersonRef } from "@/api/client";
import { getStudentDirectory, sortByClass } from "@/lib/student-directory";

const cls = (name: string, gradeLevel: number): ClassGroup => ({
  id: name, creator: null, name, grade_level: gradeLevel, year: null, teacher: null,
});
const person = (name: string): PersonRef => ({
  id: name, username: name.toLowerCase(), display_name: name, student_number: null,
} as PersonRef);

describe("sortByClass", () => {
  test("orders by grade, then şube, then name; classless students last", () => {
    const rows = [
      { person: person("Zeynep"), classes: [cls("10-B", 10)] },
      { person: person("Ali"), classes: [] },
      { person: person("Can"), classes: [cls("9-A", 9)] },
      { person: person("Ayşe"), classes: [cls("10-A", 10)] },
      { person: person("Burak"), classes: [cls("10-B", 10)] },
      { person: person("Deniz"), classes: [cls("9-B", 9)] },
    ];
    expect(sortByClass(rows).map((row) => row.person.display_name))
      .toEqual(["Can", "Deniz", "Ayşe", "Burak", "Zeynep", "Ali"]);
  });

  test("files a student in several classes under the earliest one", () => {
    const rows = [
      { person: person("Ece"), classes: [cls("10-B", 10), cls("9-A", 9)] },
      { person: person("Mert"), classes: [cls("9-B", 9)] },
    ];
    const sorted = sortByClass(rows);
    expect(sorted.map((row) => row.person.display_name)).toEqual(["Ece", "Mert"]);
    expect(sorted[0].classes.map((c) => c.name)).toEqual(["9-A", "10-B"]);
  });
});

const member = (classId: string, user: PersonRef): ClassMember => ({
  id: `m-${user.id}`, class: classId, user, added_by: user, joined_at: 0, left_at: null, source_class_group: null,
});
const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });

describe("getStudentDirectory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("with no class, reads every student and every class's members as before", async () => {
    const calls: string[] = [];
    const respond = (url: string): Response => {
      calls.push(url);
      if (url === "/api/users/search?q=&role=student")
        return jsonResponse({ items: [person("Zeynep"), person("Ali")], total: 2, limit: null, offset: 0 });
      if (url === "/api/classes?limit=200")
        return jsonResponse({ items: [cls("9-A", 9), cls("10-B", 10)], total: 2, limit: 200, offset: 0 });
      if (url === "/api/classes/9-A/members?limit=500")
        return jsonResponse({ items: [member("9-A", person("Ali"))], total: 1, limit: 500, offset: 0 });
      if (url === "/api/classes/10-B/members?limit=500") return jsonResponse({ items: [], total: 0, limit: 500, offset: 0 });
      throw new Error(`unexpected fetch: ${url}`);
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => respond(String(input))));

    const rows = await getStudentDirectory();

    expect(calls).toEqual([
      "/api/users/search?q=&role=student",
      "/api/classes?limit=200",
      "/api/classes/9-A/members?limit=500",
      "/api/classes/10-B/members?limit=500",
    ]);
    expect(rows.map((row) => row.person.display_name)).toEqual(["Ali", "Zeynep"]);
    expect(rows[0].classes.map((c) => c.name)).toEqual(["9-A"]);
    expect(rows[1].classes).toEqual([]);
  });

  test("with a class picked, reads only that roster, following offsets to total", async () => {
    const calls: string[] = [];
    const respond = (url: string): Response => {
      calls.push(url);
      if (url === "/api/classes/c1/members?limit=500&offset=0")
        return jsonResponse({ items: [member("c1", person("Ali")), member("c1", person("Burak"))], total: 3, limit: 500, offset: 0 });
      if (url === "/api/classes/c1/members?limit=500&offset=2")
        return jsonResponse({ items: [member("c1", person("Can"))], total: 3, limit: 500, offset: 2 });
      throw new Error(`unexpected fetch: ${url}`);
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => respond(String(input))));
    const nineA = { ...cls("9-A", 9), id: "c1" };

    const rows = await getStudentDirectory(nineA);

    expect(calls).toEqual(["/api/classes/c1/members?limit=500&offset=0", "/api/classes/c1/members?limit=500&offset=2"]);
    expect(rows.map((row) => row.person.display_name)).toEqual(["Ali", "Burak", "Can"]);
    expect(rows.every((row) => row.classes.length === 1 && row.classes[0] === nineA)).toBe(true);
  });

  test("with a class picked and a roster within one page, fetches it once", async () => {
    const calls: string[] = [];
    const respond = (url: string): Response => {
      calls.push(url);
      if (url === "/api/classes/c2/members?limit=500&offset=0")
        return jsonResponse({ items: [member("c2", person("Ali"))], total: 1, limit: 500, offset: 0 });
      throw new Error(`unexpected fetch: ${url}`);
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => respond(String(input))));

    const rows = await getStudentDirectory({ ...cls("9-A", 9), id: "c2" });

    expect(calls).toEqual(["/api/classes/c2/members?limit=500&offset=0"]);
    expect(rows.map((row) => row.person.display_name)).toEqual(["Ali"]);
  });
});
