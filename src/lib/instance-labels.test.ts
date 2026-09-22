import { formatInstanceLabel, loadInstanceLabels, resetInstanceLabelCache } from "./instance-labels";

const calls: string[] = [];

vi.mock("@/api/instances", () => ({
  getInstanceById: async (id: string) => {
    calls.push(`instance:${id}`);
    if (id === "missing") throw new Error("404");
    return { id, course: id === "i2" ? "c-math" : "c-math", class: id === "i2" ? "k-9a" : "k-10b" };
  },
}));
vi.mock("@/api/courses", () => ({
  getCourseById: async (id: string) => {
    calls.push(`course:${id}`);
    return { id, title: "Matematik" };
  },
}));
vi.mock("@/api/classes", () => ({
  getClassById: async (id: string) => {
    calls.push(`class:${id}`);
    return { id, name: id === "k-9a" ? "9-A" : "10-B" };
  },
  getMyClasses: async () => {
    calls.push("classes:me");
    return { items: [{ id: "k-10b", name: "10-B" }], total: 1, limit: null, offset: 0 };
  },
}));

describe("instance labels", () => {
  beforeEach(() => {
    calls.length = 0;
    resetInstanceLabelCache();
  });

  it("names the class next to the course so two sections of one ders differ", async () => {
    const labels = await loadInstanceLabels(["i1", "i2", "i1"], "admin");
    expect(labels.get("i1")?.label).toBe("Matematik — 10-B");
    expect(labels.get("i2")?.label).toBe("Matematik — 9-A");
    // The shared course is read once.
    expect(calls.filter((call) => call === "course:c-math")).toHaveLength(1);
  });

  it("reads a student's class names from /classes/me, never /classes/{id}", async () => {
    const labels = await loadInstanceLabels(["i1", "i2"], "student");
    expect(labels.get("i1")?.label).toBe("Matematik — 10-B");
    // 9-A is not the student's class: the label falls back to the course title.
    expect(labels.get("i2")?.label).toBe("Matematik");
    expect(calls.some((call) => call.startsWith("class:"))).toBe(false);
    expect(calls.filter((call) => call === "classes:me")).toHaveLength(1);
  });

  it("drops an unreadable instance instead of inventing a label", async () => {
    const labels = await loadInstanceLabels(["missing"], "admin");
    expect(labels.has("missing")).toBe(false);
  });

  it("formats partial labels", () => {
    expect(formatInstanceLabel("Fizik", null)).toBe("Fizik");
    expect(formatInstanceLabel(null, "9-A")).toBe("9-A");
    expect(formatInstanceLabel(null, null)).toBe("");
  });
});
