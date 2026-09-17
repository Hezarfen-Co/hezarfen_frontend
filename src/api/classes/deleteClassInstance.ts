import { client } from "../client";

/**
 * Detaches an instance from a class. The second segment is the **instance id**
 * (`getClassInstances`), not a course id — two sections teaching the same
 * course hold two instances. Everything the class taught under it goes with
 * it: exams, homework, sessions, roll call, and the whole roster, hand-placed
 * rows included (an enrollment cannot outlive its instance).
 */
export function deleteClassInstance(classId: string, instanceId: string): Promise<void> {
  return client<void>(`/classes/${classId}/instances/${instanceId}`, { method: "DELETE" });
}
