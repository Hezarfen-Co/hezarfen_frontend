import { describe, expect, it } from "vitest";
import { safeCelebiRoute } from "./celebi-route";

describe("safeCelebiRoute", () => {
  it("keeps an in-app path, trimmed", () => {
    expect(safeCelebiRoute("/exams")).toBe("/exams");
    expect(safeCelebiRoute("  /management/classes/abc  ")).toBe("/management/classes/abc");
    expect(safeCelebiRoute("/calendar?view=week")).toBe("/calendar?view=week");
  });

  it("rejects anything that could leave the app", () => {
    expect(safeCelebiRoute("//evil.example/phish")).toBeNull();
    expect(safeCelebiRoute("/\\evil.example")).toBeNull();
    expect(safeCelebiRoute("https://evil.example")).toBeNull();
    expect(safeCelebiRoute("javascript:alert(1)")).toBeNull();
    expect(safeCelebiRoute("exams")).toBeNull();
  });

  it("rejects a path that is not one", () => {
    expect(safeCelebiRoute("/exams and more")).toBeNull();
    expect(safeCelebiRoute("/exams\nHost: evil")).toBeNull();
    expect(safeCelebiRoute("")).toBeNull();
    expect(safeCelebiRoute(null)).toBeNull();
    expect(safeCelebiRoute(undefined)).toBeNull();
  });
});
