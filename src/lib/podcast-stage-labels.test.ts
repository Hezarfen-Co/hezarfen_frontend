import { expect, test } from "vitest";
import { en } from "@/i18n/locales/en";
import { tr } from "@/i18n/locales/tr";
import type { MessageKey } from "@/i18n/messages";
import { PODCAST_STAGE_KEYS, podcastStageLabel } from "./podcast-stage-labels";

const locales = { en, tr } as const;

test("every known stage has a non-empty label in both locales", () => {
  for (const stage of Object.keys(PODCAST_STAGE_KEYS)) {
    for (const [name, dict] of Object.entries(locales)) {
      const label = podcastStageLabel(stage, (key) => dict[key]);
      expect(label, `${name}:${stage}`).not.toBe("");
      expect(label, `${name}:${stage}`).not.toBe(stage);
    }
  }
});

test("an unknown stage falls back to the raw key", () => {
  const t = (key: MessageKey) => key;
  expect(podcastStageLabel("synthesizing", t)).toBe("synthesizing");
  expect(podcastStageLabel("toString", t)).toBe("toString");
  expect(podcastStageLabel("", t)).toBe("");
});
