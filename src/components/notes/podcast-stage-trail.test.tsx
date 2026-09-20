import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastStageTrail } from "@/components/notes/podcast-stage-trail";

const T = Date.UTC(2026, 0, 2, 10, 0, 0);

describe("PodcastStageTrail", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("times each stage by the one that replaced it", () => {
    render(() => (
      <PodcastStageTrail
        entries={[
          { stage: "queued", at: T },
          { stage: "synthesizing", at: T + 12_000 },
        ]}
        live={false}
        label="Aşamalar"
      />
    ));

    expect(screen.getByText("queued")).toBeTruthy();
    expect(screen.getByText("synthesizing")).toBeTruthy();
    expect(screen.getByText("00:12")).toBeTruthy();
  });

  it("leaves the last stage of a settled job without a span to guess at", () => {
    render(() => (
      <PodcastStageTrail entries={[{ stage: "queued", at: T }]} live={false} label="Aşamalar" />
    ));

    expect(screen.getByText("—")).toBeTruthy();
  });

  it("measures the running stage against the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T + 7_000);

    render(() => (
      <PodcastStageTrail entries={[{ stage: "queued", at: T }]} live label="Aşamalar" />
    ));

    expect(screen.getByText("00:07")).toBeTruthy();
  });

  it("shows the service's own stage names verbatim", () => {
    render(() => (
      <PodcastStageTrail entries={[{ stage: "some_unknown_stage", at: T }]} live label="Aşamalar" />
    ));

    expect(screen.getByText("some_unknown_stage")).toBeTruthy();
  });
});
