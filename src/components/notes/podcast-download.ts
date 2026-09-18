import type { Locale } from "@/i18n/messages";
import { usePreferences } from "@/stores/preferences-context";

/**
 * Lane-scoped strings for the episode download control, kept out of the shared
 * `src/i18n/messages.ts` so this surface can land without touching the
 * parallel lanes that edit that file. Same shape as the shared dictionary:
 * a typed key union, one record per locale, English as the last-resort
 * fallback — only the storage location differs.
 */
export type PodcastDownloadKey =
  | "podcast.download.label"
  | "podcast.download.aria"
  | "podcast.download.fallback";

const dict: Record<Locale, Record<PodcastDownloadKey, string>> = {
  en: {
    "podcast.download.label": "Download",
    "podcast.download.aria": "Download episode",
    "podcast.download.fallback": "episode",
  },
  tr: {
    "podcast.download.label": "İndir",
    "podcast.download.aria": "Bölümü indir",
    "podcast.download.fallback": "bölüm",
  },
};

export function usePodcastDownloadT() {
  const { locale } = usePreferences();
  return (key: PodcastDownloadKey): string => dict[locale()][key] ?? dict.en[key];
}

/**
 * The `download` filename for one episode: the note's own title plus `.mp3`.
 * The title is what the reader recognizes, so it leads; a missing title falls
 * back to the caller's label rather than a raw id. Filesystem-hostile
 * characters are dropped so the attribute is always a plain single-segment
 * name, whatever the note is called.
 */
export function podcastDownloadFilename(title: string | null | undefined, fallback: string): string {
  const base = (title ?? "").trim();
  const chosen = base.length > 0 ? base : fallback;
  const safe = chosen.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim();
  return `${safe.length > 0 ? safe : fallback}.mp3`;
}
