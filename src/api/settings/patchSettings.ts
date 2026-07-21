import { client } from "../client";
import { setCachedSettings } from "./getSettings";
import type { ExamKindSetting, GradeBand, SchoolSettings } from "../client";

export type PatchSettingsBody = {
  exam_kinds?: ExamKindSetting[];
  attendance_statuses?: string[];
  grade_bands?: GradeBand[];
  max_file_bytes?: number;
};

export function patchSettings(body: PatchSettingsBody): Promise<SchoolSettings> {
  return client<SchoolSettings>("/settings", { method: "PATCH", body }).then((settings) => {
    setCachedSettings(settings);
    return settings;
  });
}
