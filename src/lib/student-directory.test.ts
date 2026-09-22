import { describe, expect, test } from "vitest";
import type { ClassGroup, PersonRef } from "@/api/client";
import { sortByClass } from "@/lib/student-directory";

const cls = (name: string, grade: string | null): ClassGroup => ({
  id: name, creator: null, name, grade, year: null, teacher: null,
});
const person = (name: string): PersonRef => ({
  id: name, username: name.toLowerCase(), display_name: name, student_number: null,
} as PersonRef);

describe("sortByClass", () => {
  test("orders by grade, then şube, then name; classless students last", () => {
    const rows = [
      { person: person("Zeynep"), classes: [cls("10-B", "10")] },
      { person: person("Ali"), classes: [] },
      { person: person("Can"), classes: [cls("9-A", "9")] },
      { person: person("Ayşe"), classes: [cls("10-A", "10")] },
      { person: person("Burak"), classes: [cls("10-B", "10")] },
      { person: person("Deniz"), classes: [cls("9-B", "9")] },
    ];
    expect(sortByClass(rows).map((row) => row.person.display_name))
      .toEqual(["Can", "Deniz", "Ayşe", "Burak", "Zeynep", "Ali"]);
  });

  test("files a student in several classes under the earliest one", () => {
    const rows = [
      { person: person("Ece"), classes: [cls("10-B", "10"), cls("9-A", "9")] },
      { person: person("Mert"), classes: [cls("9-B", "9")] },
    ];
    const sorted = sortByClass(rows);
    expect(sorted.map((row) => row.person.display_name)).toEqual(["Ece", "Mert"]);
    expect(sorted[0].classes.map((c) => c.name)).toEqual(["9-A", "10-B"]);
  });
});
