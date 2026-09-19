import { routeModule } from "@/lib/route-module";

describe("routeModule", () => {
  it("maps module pages and their detail routes", () => {
    expect(routeModule("/notes")).toBe("notes");
    expect(routeModule("/notes/abc")).toBe("notes");
    expect(routeModule("/exam-room/1")).toBe("exams");
    expect(routeModule("/question-bank/9")).toBe("bank_questions");
    expect(routeModule("/ai/studio")).toBe("course_notes");
  });

  it("prefers the longest prefix", () => {
    expect(routeModule("/students/exams")).toBe("marks");
    expect(routeModule("/management/classes/3")).toBe("classes");
  });

  it("leaves core routes and look-alike prefixes unmapped", () => {
    expect(routeModule("/")).toBeNull();
    expect(routeModule("/calendar")).toBeNull();
    expect(routeModule("/management/students")).toBeNull();
    expect(routeModule("/notebook")).toBeNull();
    // Study and insights read RAG/insight doors no school module gates.
    expect(routeModule("/ai/study")).toBeNull();
    expect(routeModule("/ai/insights")).toBeNull();
  });
});
