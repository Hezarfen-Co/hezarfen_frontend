import { backTarget } from "./back-target";

const ROUTES = [
  "/",
  "/exams",
  "/exams/$id",
  "/exams/$id/live",
  "/instances/$id",
  "/exam-room/$id",
  "/courses",
  "/management/classes",
  "/management/classes/$id",
  "/management/settings",
  "/profile/$userId",
];

it("goes from a detail page to its list", () => {
  expect(backTarget("/exams/42", ROUTES)).toBe("/exams");
  expect(backTarget("/management/classes/7", ROUTES)).toBe("/management/classes");
});

it("goes from a nested page to the record it belongs to", () => {
  expect(backTarget("/exams/42/live", ROUTES)).toBe("/exams/42");
});

it("uses the hub for details that have no list of their own", () => {
  expect(backTarget("/instances/7", ROUTES)).toBe("/courses");
  expect(backTarget("/exam-room/3", ROUTES)).toBe("/exams");
  expect(backTarget("/profile/u-1", ROUTES)).toBe("/");
});

it("falls back to home when no ancestor route exists", () => {
  expect(backTarget("/management/settings", ROUTES)).toBe("/");
  expect(backTarget("/exams", ROUTES)).toBe("/");
});
