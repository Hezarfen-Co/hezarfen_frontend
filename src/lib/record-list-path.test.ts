import { expect, test } from "vitest";
import { ApiError } from "@/api/client";
import { isNotFoundError, listPathFor } from "./record-list-path";

const routes = new Set(["/", "/courses", "/management/classes", "/notes", "/admin/users"]);
const has = (path: string) => routes.has(path);

test("a detail URL points back at its list", () => {
  expect(listPathFor("/management/classes/bad-id", has)).toBe("/management/classes");
  expect(listPathFor("/notes/bad-id/", has)).toBe("/notes");
  expect(listPathFor("/admin/users/x", has)).toBe("/admin/users");
});

test("instances go back to courses, unknown parents go home", () => {
  expect(listPathFor("/instances/x", has)).toBe("/courses");
  expect(listPathFor("/nowhere/x", has)).toBe("/");
  expect(listPathFor("/x", has)).toBe("/");
});

test("only an ApiError 404 counts as not found", () => {
  expect(isNotFoundError(new ApiError(404, "not found"))).toBe(true);
  expect(isNotFoundError(new ApiError(500, "boom"))).toBe(false);
  expect(isNotFoundError(new Error("404"))).toBe(false);
});
