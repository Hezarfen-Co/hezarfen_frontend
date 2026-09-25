import type { MessageKey } from "@/i18n/messages";

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

const HOLIDAY_KIND_KEYS: Record<string, MessageKey> = {
  resmi: "holidays.kind.resmi",
  dini: "holidays.kind.dini",
  idari: "holidays.kind.idari",
  ara: "holidays.kind.ara",
};

/** The published holiday kinds (limits.holiday.kinds) in the reader's words. */
export function holidayKindLabel(kind: string, t: Translate): string {
  const key = HOLIDAY_KIND_KEYS[kind];
  return key ? t(key) : kind;
}
