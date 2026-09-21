import { compactPageSize } from "@/lib/create-page-size";

it("halves a page for phones, never below five", () => {
  expect(compactPageSize(10)).toBe(5);
  expect(compactPageSize(8)).toBe(5);
  expect(compactPageSize(12)).toBe(6);
  expect(compactPageSize(15)).toBe(8);
  expect(compactPageSize(20)).toBe(10);
});

it("leaves an already short page alone", () => {
  expect(compactPageSize(5)).toBe(5);
  expect(compactPageSize(4)).toBe(4);
  expect(compactPageSize(1)).toBe(1);
});
