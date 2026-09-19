import { getClassMembers, getClasses } from "@/api/classes";
import { getUserSearch } from "@/api/users";
import type { ClassGroup, PersonRef } from "@/api/client";

export type StudentDirectoryRow = {
  person: PersonRef;
  classes: ClassGroup[];
};

/** Shared student list for teacher-facing reports: one name column and the classes it belongs to. */
export async function getStudentDirectory(): Promise<StudentDirectoryRow[]> {
  const [students, classes] = await Promise.all([
    getUserSearch("", undefined, "student"),
    getClasses({ limit: 200 }),
  ]);
  const byStudent = new Map<string, ClassGroup[]>();
  const memberships = await Promise.all(
    classes.items.map(async (cls) => ({ cls, members: (await getClassMembers(cls.id, { limit: 500 })).items })),
  );
  for (const { cls, members } of memberships) {
    for (const member of members) {
      byStudent.set(member.user.id, [...(byStudent.get(member.user.id) ?? []), cls]);
    }
  }
  return students.items.map((person) => ({ person, classes: byStudent.get(person.id) ?? [] }));
}
