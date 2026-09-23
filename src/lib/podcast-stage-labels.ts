import type { MessageKey } from "@/i18n/messages";

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

/**
 * Pipeline stage keys the job trail can show.
 *
 * The backend forwards `stage` as a free string (`PodcastJobStatus.stage`).
 * The frontend records `queued` itself before the first poll; the service
 * then reports one of its mode tuples and `done` when the job finishes:
 * simulate `ocr → plan → script → tts → mux`, API `kaynak → metin → script →
 * tts → mux`, local `ingest → scriptler → quiz → ses`. `failed` / `cancelled`
 * are job states, not stages — a cancel clears the stage, a failure keeps
 * the last one.
 */
export const PODCAST_STAGE_KEYS = {
  queued: "podcast.stage.queued",
  ocr: "podcast.stage.ocr",
  plan: "podcast.stage.plan",
  kaynak: "podcast.stage.kaynak",
  metin: "podcast.stage.metin",
  ingest: "podcast.stage.ingest",
  script: "podcast.stage.script",
  scriptler: "podcast.stage.scriptler",
  quiz: "podcast.stage.quiz",
  tts: "podcast.stage.tts",
  ses: "podcast.stage.ses",
  mux: "podcast.stage.mux",
  done: "podcast.stage.done",
} as const satisfies Record<string, MessageKey>;

/** Display label for a podcast stage key; an unknown key shows as sent. */
export function podcastStageLabel(stage: string, t: Translate): string {
  if (!Object.hasOwn(PODCAST_STAGE_KEYS, stage)) return stage;
  return t(PODCAST_STAGE_KEYS[stage as keyof typeof PODCAST_STAGE_KEYS]);
}
