import { ApiError, formatApiError } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

const MODULE_KEYS: Record<string, MessageKey> = {
  appointments: "module.appointments",
  attendance: "module.attendance",
  bank_questions: "module.bank_questions",
  boards: "module.boards",
  chatbot: "module.chatbot",
  classes: "module.classes",
  course_notes: "module.course_notes",
  courses: "module.courses",
  events: "module.events",
  exams: "module.exams",
  homework: "module.homework",
  marks: "module.marks",
  meals: "module.meals",
  messages: "module.messages",
  notes: "module.notes",
  payments: "module.payments",
  pomodoro: "module.pomodoro",
  questions: "module.questions",
  sessions: "module.sessions",
  subjects: "module.subjects",
  work: "module.work",
};

const PACKAGE_KEYS: Record<string, MessageKey> = {
  academics: "package.academics",
  ai: "package.ai",
  communication: "package.communication",
  operations: "package.operations",
};

/** Localized module name; a module newer than this table falls back to its wire name. */
export function moduleLabel(module: string, t: Translate): string {
  const key = MODULE_KEYS[module];
  return key ? t(key) : module;
}

export function packageLabel(pkg: string, t: Translate): string {
  const key = PACKAGE_KEYS[pkg];
  return key ? t(key) : pkg;
}

/**
 * A module write refused with 409 names its broken dependencies in fixed
 * English (module.rs `validate`, builder.rs `refuse_if_needed`); render them
 * with localized module names instead of the generic error line.
 */
export function formatModuleError(err: unknown, t: Translate): string {
  if (err instanceof ApiError && err.status === 409) {
    const text = err.message.replace(/^conflict:\s*/i, "");
    const missing = [...text.matchAll(/([a-z_]+) requires ([a-z_]+), which is not enabled/g)];
    if (missing.length > 0) {
      return missing
        .map((match) => t("modules.conflictRequires", { module: moduleLabel(match[1], t), needed: moduleLabel(match[2], t) }))
        .join(" ");
    }
    const requiredBy = text.match(/^([a-z_]+) is required by ([a-z_, ]+)$/);
    if (requiredBy) {
      const dependents = requiredBy[2].split(",").map((name) => moduleLabel(name.trim(), t)).join(", ");
      return t("modules.conflictRequiredBy", { module: moduleLabel(requiredBy[1], t), dependents });
    }
  }
  return formatApiError(err);
}
