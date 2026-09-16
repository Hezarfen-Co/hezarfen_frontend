import { createRoot } from "solid-js";
import { createStudentClassLabels } from "./student-classes";

const calls: string[] = [];
const classesByUser: Record<string, string[]> = {
  s1: ["10-A"],
  s2: ["11-B", "Seçmeli Fizik"],
  s3: [],
  s9: ["9-C"],
};

vi.mock("@/api/classes", () => ({
  getClassesByUserId: async (userId: string) => {
    calls.push(userId);
    const names = classesByUser[userId];
    if (!names) throw new Error("403");
    return { items: names.map((name, index) => ({ id: `${userId}-${index}`, name })), total: names.length, limit: null, offset: 0 };
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Solid holds effects until the root's synchronous body returns, so the root
// is entered and left before anything is awaited.
function withRoot<T>(build: () => T): [T, () => void] {
  let value!: T;
  let dispose!: () => void;
  createRoot((disposeRoot) => {
    dispose = disposeRoot;
    value = build();
  });
  return [value, dispose];
}

describe("createStudentClassLabels", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("resolves a class name per student and joins multiple memberships", async () => {
    const [labels, dispose] = withRoot(() => createStudentClassLabels(() => ["s1", "s2"]));
    await flush();
    expect(labels().s1).toBe("10-A");
    expect(labels().s2).toBe("11-B, Seçmeli Fizik");
    dispose();
  });

  it("leaves a student with no class — or a refused lookup — unlabelled", async () => {
    const [labels, dispose] = withRoot(() => createStudentClassLabels(() => ["s3", "forbidden"]));
    await flush();
    expect(labels().s3).toBeUndefined();
    expect(labels().forbidden).toBeUndefined();
    dispose();
  });

  it("asks the backend once per student, however often the list is read", async () => {
    const [, disposeFirst] = withRoot(() => createStudentClassLabels(() => ["s9"]));
    await flush();
    const [, disposeSecond] = withRoot(() => createStudentClassLabels(() => ["s9"]));
    await flush();
    expect(calls.filter((id) => id === "s9")).toHaveLength(1);
    disposeFirst();
    disposeSecond();
  });
});
