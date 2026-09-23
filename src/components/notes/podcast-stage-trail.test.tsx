import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodcastStageTrail } from "@/components/notes/podcast-stage-trail";
import { PreferencesProvider } from "@/stores/preferences-context";

const T = Date.UTC(2026, 0, 2, 10, 0, 0);

function trail(props: { entries: { stage: string; at: number }[]; live: boolean }) {
  return (
    <PreferencesProvider>
      <PodcastStageTrail entries={props.entries} live={props.live} label="Aşamalar" />
    </PreferencesProvider>
  );
}

describe("PodcastStageTrail", () => {
  beforeEach(() => {
    localStorage.setItem("hezarfen.locale", "en");
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("hezarfen.locale");
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("times each stage by the one that replaced it", () => {
    render(() =>
      trail({
        entries: [
          { stage: "queued", at: T },
          { stage: "synthesizing", at: T + 12_000 },
        ],
        live: false,
      }),
    );

    expect(screen.getByText("Waiting in queue")).toBeTruthy();
    expect(screen.getByText("synthesizing")).toBeTruthy();
    expect(screen.getByText("00:12")).toBeTruthy();
  });

  it("leaves the last stage of a settled job without a span to guess at", () => {
    render(() => trail({ entries: [{ stage: "queued", at: T }], live: false }));

    expect(screen.getByText("—")).toBeTruthy();
  });

  it("measures the running stage against the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T + 7_000);

    render(() => trail({ entries: [{ stage: "queued", at: T }], live: true }));

    expect(screen.getByText("00:07")).toBeTruthy();
  });

  it("shows an unknown stage as the service sent it", () => {
    render(() => trail({ entries: [{ stage: "some_unknown_stage", at: T }], live: true }));

    expect(screen.getByText("some_unknown_stage")).toBeTruthy();
  });
});
