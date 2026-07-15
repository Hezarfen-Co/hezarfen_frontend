import { client } from "./client";
import type { ExamKindSetting, GradeBand, SchoolSettings } from "./types";

export type PatchSettingsBody = {
  exam_kinds?: ExamKindSetting[];
  attendance_statuses?: string[];
  grade_bands?: GradeBand[];
};

export function patchSettings(body: PatchSettingsBody): Promise<SchoolSettings> {
  return client<SchoolSettings>("/settings", { method: "PATCH", body });
}
