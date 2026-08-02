import { client } from "../client";
import { setCachedSettings } from "./getSettings";
import type { ExamKindSetting, GradeBand, MealSlot, SchoolSettings } from "../client";

export type PatchSettingsBody = {
  exam_kinds?: ExamKindSetting[];
  attendance_statuses?: string[];
  grade_bands?: GradeBand[];
  max_file_bytes?: number;
  chatbot_history_turns?: number;
  max_chatbot_threads?: number;
  max_chatbot_message_len?: number;
  meal_slots?: MealSlot[];
  dietary_tags?: string[];
  meal_cancel_cutoff_minutes?: number | null;
};

export function patchSettings(body: PatchSettingsBody): Promise<SchoolSettings> {
  return client<SchoolSettings>("/settings", { method: "PATCH", body }).then((settings) => {
    setCachedSettings(settings);
    return settings;
  });
}
