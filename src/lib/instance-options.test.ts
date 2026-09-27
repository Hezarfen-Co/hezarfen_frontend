import { beforeEach, expect, test, vi } from "vitest";
import { loadInstanceOptions } from "./instance-options";
import { resetInstanceLabelCache } from "./instance-labels";

const { getClasses, getClassInstances } = vi.hoisted(() => ({
  getClasses: vi.fn(),
  getClassInstances: vi.fn(),
}));

vi.mock("@/api/classes", () => ({ getClasses, getClassInstances }));
vi.mock("@/api/instances", () => ({ getMyInstances: vi.fn() }));

beforeEach(() => {
  resetInstanceLabelCache();
  getClasses.mockReset().mockResolvedValue({ items: [
    { id: "c1", name: "9-A", grade_level: 9 },
    { id: "c2", name: "9-B", grade_level: 9 },
  ] });
  getClassInstances.mockReset().mockImplementation(async (id: string) => ({ items: [
    { id: `i-${id}`, course: "math", class: id, title: "Math" },
  ] }));
});

test("manager pickers reuse the school section walk across visits", async () => {
  const first = await loadInstanceOptions("manager");
  const second = await loadInstanceOptions("manager");

  expect(first.map((row) => row.label)).toEqual(["Math — 9-A", "Math — 9-B"]);
  expect(second).toEqual(first);
  expect(getClasses).toHaveBeenCalledTimes(1);
  expect(getClassInstances).toHaveBeenCalledTimes(2);
});
