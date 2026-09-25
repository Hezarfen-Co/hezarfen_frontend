import type { MessageKey } from "@/i18n/messages";

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

/** The grade ladder the backend accepts: 0 (anaokulu) through 12. */
export const MIN_GRADE_LEVEL = 0;
export const MAX_GRADE_LEVEL = 12;

/** "Anaokulu" at the floor, "9. sınıf" elsewhere. */
export function gradeLevelLabel(level: number, t: Translate): string {
  return level === 0 ? t("grade.kindergarten") : t("grade.level", { level: String(level) });
}

/** Every rung between the published bounds, lowest first. */
export function gradeLevels(min = MIN_GRADE_LEVEL, max = MAX_GRADE_LEVEL): number[] {
  const levels: number[] = [];
  for (let level = min; level <= max; level++) levels.push(level);
  return levels;
}

/**
 * The backend's own text for a rung ("Anaokulu", "1".."12") — what a RAG
 * scope pair names as `sinif`. Not a display string; use gradeLevelLabel.
 */
export function gradeLevelWireLabel(level: number): string {
  return level === 0 ? "Anaokulu" : String(level);
}
