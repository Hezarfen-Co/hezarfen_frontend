import { formatMessage, type Locale } from "@/i18n/messages";

/**
 * Copy for the AI output drawer and its export actions.
 *
 * These strings deliberately live in their own module instead of the shared
 * `src/i18n/messages.ts` table: that file is being edited by sibling lanes on
 * the same day this drawer was built. The shape mirrors the shared table — a
 * typed key union, one dict per locale, `{var}` interpolation through
 * `formatMessage` — so the entries can be folded into the shared table later
 * without touching a call site.
 */
export type RagOutputMessageKey =
  | "view"
  | "drawerTitle"
  | "date"
  | "note"
  | "sources"
  | "noSources"
  | "unnamedSource"
  | "emptyText"
  | "failedTitle"
  | "failedLine"
  | "otherFields"
  | "chunks"
  | "technical"
  | "copy"
  | "copied"
  | "copyFailed"
  | "download"
  | "print";

const en: Record<RagOutputMessageKey, string> = {
  "view": "View",
  "drawerTitle": "AI output",
  "date": "Date",
  "note": "Note",
  "sources": "Source attachments",
  "noSources": "No attachments — built from the note text.",
  "unnamedSource": "Unnamed attachment",
  "emptyText": "This output has no readable text. The raw record is below.",
  "failedTitle": "Some attachments could not be processed",
  "failedLine": "Not processed: {names}",
  "otherFields": "Other fields",
  "chunks": "Text chunks",
  "technical": "Technical details",
  "copy": "Copy",
  "copied": "Copied to the clipboard",
  "copyFailed": "Could not copy to the clipboard.",
  "download": "Download (.md)",
  "print": "Print / PDF",
};

const tr: Record<RagOutputMessageKey, string> = {
  "view": "Görüntüle",
  "drawerTitle": "YZ çıktısı",
  "date": "Tarih",
  "note": "Not",
  "sources": "Kaynak ekler",
  "noSources": "Ek yok — not metninden oluşturuldu.",
  "unnamedSource": "Adı bilinmeyen ek",
  "emptyText": "Bu çıktıda okunabilir bir metin yok. Ham kayıt aşağıdadır.",
  "failedTitle": "Bazı ekler işlenemedi",
  "failedLine": "İşlenemeyenler: {names}",
  "otherFields": "Diğer alanlar",
  "chunks": "Metin parçaları",
  "technical": "Teknik ayrıntı",
  "copy": "Kopyala",
  "copied": "Panoya kopyalandı",
  "copyFailed": "Panoya kopyalanamadı.",
  "download": "İndir (.md)",
  "print": "Yazdır / PDF",
};

export function ragOutputMessage(
  locale: Locale,
  key: RagOutputMessageKey,
  vars?: Record<string, string | number>,
): string {
  return formatMessage((locale === "tr" ? tr : en)[key], vars);
}
