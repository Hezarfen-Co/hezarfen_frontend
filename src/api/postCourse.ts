import { client } from "./client";
import type { Course } from "./types";

export type PostCourseBody = {
  title: string;
  description?: string | null;
};

export function postCourse(body: PostCourseBody): Promise<Course> {
  return client<Course>("/courses", { method: "POST", body });
}
