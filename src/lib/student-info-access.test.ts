import { describe, expect, it } from "vitest";
import { studentInfoSource } from "./student-info-access";

const student = { id: "s1", role: "student" as const };

describe("studentInfoSource", () => {
  it("lets the student see their own info", () => {
    expect(studentInfoSource({ id: "s1", role: "student" }, student)).toBe("self");
  });

  it("hides it from another student", () => {
    expect(studentInfoSource({ id: "s2", role: "student" }, student)).toBeNull();
  });

  it("opens it to staff, admin reading the full record", () => {
    expect(studentInfoSource({ id: "a", role: "admin" }, student)).toBe("admin");
    expect(studentInfoSource({ id: "m", role: "manager" }, student)).toBe("staff");
    expect(studentInfoSource({ id: "t", role: "teacher" }, student)).toBe("staff");
  });

  it("opens it to a parent (the profile is already a 403 for unlinked ones)", () => {
    expect(studentInfoSource({ id: "p", role: "parent" }, student)).toBe("parent");
  });

  it("never shows on a non-student profile or without a session", () => {
    expect(studentInfoSource({ id: "a", role: "admin" }, { id: "t", role: "teacher" })).toBeNull();
    expect(studentInfoSource({ id: "t", role: "teacher" }, { id: "t", role: "teacher" })).toBeNull();
    expect(studentInfoSource(null, student)).toBeNull();
  });
});
