import { formatInstanceLabel, loadInstanceLabels, resetInstanceLabelCache } from "./instance-labels";

const calls: string[] = [];

vi.mock("@/api/instances", () => ({
  getInstanceById: async (id: string) => {
    calls.push(`instance:${id}`);
    if (id === "missing") throw new Error("404");
    // The instance carries its resolved display title, so no course read.
    return { id, course: "c-math", class: id === "i2" ? "k-9a" : "k-10b", title: "Matematik" };
  },
}));
vi.mock("@/api/classes", () => ({
  getClasses: async () => {
    calls.push("classes:list");
    return { items: [{ id: "k-9a", name: "9-A" }, { id: "k-10b", name: "10-B" }], total: 2, limit: 200, offset: 0 };
  },
  getClassInstances: async (classId: string) => {
    calls.push(`class-instances:${classId}`);
    const items = classId === "k-9a"
      ? [{ id: "i2", course: "c-math", class: "k-9a", title: "Matematik" }]
      : [{ id: "i1", course: "c-math", class: "k-10b", title: "Matematik" }, { id: "i3", course: "c-fiz", class: "k-10b", title: "Fizik" }];
    return { items, total: items.length, limit: 200, offset: 0 };
  },
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
    // No per-course or per-class reads: one class list covers every section.
    expect(calls.some((call) => call.startsWith("course:") || call.startsWith("class:"))).toBe(false);
    expect(calls.filter((call) => call === "classes:list")).toHaveLength(1);
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

  it("reads the school's sections class by class when labels outnumber classes", async () => {
    const labels = await loadInstanceLabels(["i1", "i2", "i3"], "admin");
    expect(labels.get("i3")?.label).toBe("Fizik — 10-B");
    expect(labels.get("i2")?.label).toBe("Matematik — 9-A");
    // Two classes, three sections: two list reads instead of three instance reads.
    expect(calls.filter((call) => call.startsWith("instance:"))).toHaveLength(0);
    expect(calls.filter((call) => call.startsWith("class-instances:"))).toHaveLength(2);
  });
});
