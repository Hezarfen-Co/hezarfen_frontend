import { Show, createEffect, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import {
  IconPause,
  IconPlay,
  IconSkipBack,
  IconSkipForward,
  IconVolume,
  IconVolumeLow,
  IconVolumeMute,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatDurationClock } from "@/lib/format";
import { useT } from "@/stores/preferences-context";

const SKIP_SECS = 15;
const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const RATE_KEY = "hezarfen.audio.rate";
const VOLUME_KEY = "hezarfen.audio.volume";

// One episode plays at a time: starting a player pauses whichever other one
// was playing, so a history list never talks over itself.
const players = new Set<HTMLAudioElement>();

function readStored(key: string, fallback: number, valid: (value: number) => boolean): number {
  if (typeof localStorage === "undefined") return fallback;
  const value = Number(localStorage.getItem(key));
  return localStorage.getItem(key) != null && Number.isFinite(value) && valid(value) ? value : fallback;
}

function store(key: string, value: number) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, String(value));
}

/** What a caller can drive from outside — the transcript seeks through it. */
export type AudioPlayerController = {
  seek: (secs: number) => void;
  play: () => void;
};

export type AudioPlayerProps = {
  src: string;
  title?: string;
  subtitle?: string;
  /**
   * The server's own running time, shown until the file's metadata arrives —
   * and kept when a chunked stream never reports a finite duration.
   */
  durationHint?: number | null;
  autoplay?: boolean;
  /** Trailing controls on the title row (download, …). */
  actions?: JSX.Element;
  /** Extra controls at the end of the transport row (transcript toggle, …). */
  extra?: JSX.Element;
  /**
   * Loads the whole file. Given, a seek the stream cannot serve (a server
   * that ignores `Range` leaves `seekable` empty) switches the player to a
   * local copy of it instead of snapping back to 0:00.
   */
  loadBlob?: (signal: AbortSignal) => Promise<Blob>;
  onTimeUpdate?: (secs: number) => void;
  controller?: (controller: AudioPlayerController) => void;
  class?: string;
};

/**
 * The app's audio player: one play/pause, ±15 s skips, a draggable seek bar,
 * playback speed and volume — in place of the browser's own `controls` strip,
 * which looks different in every browser and offers no speed or skip.
 *
 * The seek bar and volume are native range inputs laid over a drawn track, so
 * keyboard and screen-reader behaviour comes from the platform. Speed and
 * volume are remembered across episodes on this device.
 */
export function AudioPlayer(props: AudioPlayerProps) {
  const t = useT();
  let audio!: HTMLAudioElement;
  const [playing, setPlaying] = createSignal(false);
  const [buffering, setBuffering] = createSignal(false);
  const [current, setCurrent] = createSignal(0);
  const [mediaDuration, setMediaDuration] = createSignal<number | null>(null);
  const [buffered, setBuffered] = createSignal(0);
  const [rate, setRate] = createSignal(readStored(RATE_KEY, 1, (v) => (RATES as readonly number[]).includes(v)));
  const [volume, setVolume] = createSignal(readStored(VOLUME_KEY, 1, (v) => v >= 0 && v <= 1));
  const [muted, setMuted] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  // Seeking waits on the local copy; the seek bar already shows the target.
  const [seeking, setSeeking] = createSignal(false);
  // No src until the element is in the live document. A <Suspense> boundary
  // renders its children detached first, and Chromium refuses a media load
  // that starts off-document ("Media load rejected by URL safety check").
  const [source, setSource] = createSignal<string | undefined>();
  let connected = false;
  let retriedLoad = false;
  let disposed = false;

  // The local copy of the file, loaded once per `src` on first play or on the
  // first seek the stream cannot serve.
  let objectUrl: string | null = null;
  let localLoad: Promise<string | null> | null = null;
  let abort: AbortController | null = null;
  let pendingSeek: number | null = null;
  let resumeAfterSeek = false;
  let seekToken = 0;
  let afterLoad: (() => void) | null = null;

  const dropLocal = () => {
    abort?.abort();
    abort = null;
    localLoad = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };
  const loadLocal = (): Promise<string | null> => {
    const load = props.loadBlob;
    if (!load) return Promise.resolve(null);
    if (!localLoad) {
      const controller = new AbortController();
      abort = controller;
      localLoad = load(controller.signal).then(
        (blob) => {
          if (controller.signal.aborted) return null;
          objectUrl = URL.createObjectURL(blob);
          return objectUrl;
        },
        () => {
          if (abort === controller) localLoad = null;
          return null;
        },
      );
    }
    return localLoad;
  };
  const canSeekTo = (secs: number) => {
    const ranges = audio.seekable;
    for (let i = 0; i < ranges.length; i += 1) {
      if (ranges.end(i) > 0 && secs >= ranges.start(i) && secs <= ranges.end(i)) return true;
    }
    return false;
  };

  const duration = () => mediaDuration() ?? (props.durationHint && props.durationHint > 0 ? props.durationHint : null);
  const fraction = (value: number) => {
    const total = duration();
    return total ? Math.min(1, Math.max(0, value / total)) : 0;
  };

  const seek = (secs: number) => {
    const total = duration();
    const next = Math.max(0, total ? Math.min(total, secs) : secs);
    setCurrent(next);
    if (!props.loadBlob || canSeekTo(next)) {
      audio.currentTime = next;
      return;
    }
    // The stream cannot go there: hold the target, pause the stream at its
    // wrong position, and resume from the target on the local copy.
    const token = ++seekToken;
    pendingSeek = next;
    resumeAfterSeek ||= !audio.paused;
    audio.pause();
    setSeeking(true);
    void loadLocal().then((url) => {
      if (token !== seekToken) return;
      const at = pendingSeek ?? next;
      const resume = resumeAfterSeek;
      pendingSeek = null;
      resumeAfterSeek = false;
      if (!url) {
        setSeeking(false);
        setCurrent(audio.currentTime);
        setFailed(true);
        return;
      }
      afterLoad = () => {
        audio.currentTime = at;
        setCurrent(at);
        setSeeking(false);
        if (resume) play();
      };
      if (source() === url) {
        const run = afterLoad;
        afterLoad = null;
        run();
      } else {
        setSource(url);
      }
    });
  };
  const play = () => {
    if (pendingSeek != null) {
      resumeAfterSeek = true;
      return;
    }
    setFailed(false);
    void audio.play().catch(() => {
      // A refused autoplay or an aborted load is not a broken file; the
      // `error` event reports the latter on its own.
      setPlaying(false);
    });
  };
  const toggle = () => {
    if (pendingSeek != null) resumeAfterSeek = !resumeAfterSeek;
    else if (audio.paused) play();
    else audio.pause();
  };
  const skip = (delta: number) => seek(audio.currentTime + delta);
  const cycleRate = () => {
    const index = RATES.indexOf(rate() as (typeof RATES)[number]);
    setRate(RATES[(index + 1) % RATES.length]);
  };
  const toggleMute = () => {
    if (muted() || volume() === 0) {
      setMuted(false);
      if (volume() === 0) setVolume(1);
    } else {
      setMuted(true);
    }
  };

  onMount(() => {
    const attach = () => {
      if (disposed) return;
      if (!audio.isConnected) {
        requestAnimationFrame(attach);
        return;
      }
      connected = true;
      setSource(objectUrl ?? props.src);
    };
    attach();
    players.add(audio);
    props.controller?.({ seek, play });
  });
  onCleanup(() => {
    disposed = true;
    players.delete(audio);
    audio?.pause();
    dropLocal();
  });

  createEffect(() => {
    audio.playbackRate = rate();
    store(RATE_KEY, rate());
  });
  createEffect(() => {
    audio.volume = volume();
    audio.muted = muted();
    store(VOLUME_KEY, volume());
  });
  // A new episode in the same player starts from its own beginning.
  createEffect(() => {
    const src = props.src;
    dropLocal();
    seekToken += 1;
    pendingSeek = null;
    resumeAfterSeek = false;
    afterLoad = null;
    setSeeking(false);
    retriedLoad = false;
    if (connected) setSource(src);
    setCurrent(0);
    setMediaDuration(null);
    setBuffered(0);
    setFailed(false);
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "range") return;
    const key = event.key.toLowerCase();
    if (key === "k" || (key === " " && target.tagName !== "BUTTON")) {
      event.preventDefault();
      toggle();
    } else if (key === "j") {
      skip(-SKIP_SECS);
    } else if (key === "l") {
      skip(SKIP_SECS);
    } else if (key === "m") {
      toggleMute();
    }
  };

  const syncDuration = () => {
    const value = audio.duration;
    setMediaDuration(Number.isFinite(value) && value > 0 ? value : null);
  };
  const syncBuffered = () => {
    const ranges = audio.buffered;
    setBuffered(ranges.length ? ranges.end(ranges.length - 1) : 0);
  };

  const volumeIcon = () => {
    if (muted() || volume() === 0) return <IconVolumeMute class="h-4 w-4" />;
    if (volume() < 0.5) return <IconVolumeLow class="h-4 w-4" />;
    return <IconVolume class="h-4 w-4" />;
  };
  const rateLabel = () => `${rate().toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
  const ghostButton =
    "inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

  return (
    <div
      role="group"
      aria-label={props.title ? t("audio.playerFor", { title: props.title }) : t("audio.player")}
      class={cn("rounded-xl border border-border-hairline bg-surface-overlay/40 p-3", props.class)}
      onKeyDown={onKeyDown}
    >
      <audio
        ref={audio}
        src={source()}
        preload="metadata"
        autoplay={props.autoplay}
        onPlay={() => {
          for (const other of players) if (other !== audio) other.pause();
          setPlaying(true);
          // Fetched while the stream plays, so later skips are instant.
          void loadLocal();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onLoadedMetadata={() => {
          syncDuration();
          const run = afterLoad;
          afterLoad = null;
          run?.();
        }}
        onDurationChange={syncDuration}
        onProgress={syncBuffered}
        onTimeUpdate={() => {
          if (pendingSeek != null) return;
          setCurrent(audio.currentTime);
          props.onTimeUpdate?.(audio.currentTime);
        }}
        onError={() => {
          // One quiet retry for a load that raced the element's attachment;
          // a real failure (bad file, gone episode) fails again and shows.
          if (!retriedLoad && audio.isConnected && source()) {
            retriedLoad = true;
            audio.load();
            return;
          }
          setFailed(true);
          setPlaying(false);
          setBuffering(false);
        }}
      />

      <div class="flex items-center gap-3">
        <button
          type="button"
          class={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            (seeking() || (buffering() && playing())) && "animate-pulse",
          )}
          aria-label={playing() || seeking() ? t("audio.pause") : t("audio.play")}
          onClick={toggle}
        >
          <Show when={playing() || seeking()} fallback={<IconPlay class="ml-0.5 h-5 w-5" />}>
            <IconPause class="h-5 w-5" />
          </Show>
        </button>
        <div class="min-w-0 flex-1">
          <Show when={props.title}>
            <p class="truncate text-sm font-medium text-foreground">{props.title}</p>
          </Show>
          <Show when={props.subtitle}>
            <p class="truncate text-xs text-muted-foreground">{props.subtitle}</p>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex shrink-0 items-center gap-2">{props.actions}</div>
        </Show>
      </div>

      <div class="mt-3">
        <div class="group relative flex h-4 items-center">
          <input
            type="range"
            class="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            min="0"
            max={duration() ?? 0}
            step="0.1"
            value={current()}
            disabled={!duration()}
            aria-label={t("audio.seek")}
            aria-valuetext={t("audio.position", {
              current: formatDurationClock(current() * 1000),
              total: formatDurationClock(duration() == null ? null : duration()! * 1000),
            })}
            onInput={(event) => seek(Number(event.currentTarget.value))}
          />
          <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div class="absolute inset-y-0 left-0 bg-foreground/15" style={{ width: `${fraction(buffered()) * 100}%` }} />
            <div class="absolute inset-y-0 left-0 bg-primary" style={{ width: `${fraction(current()) * 100}%` }} />
          </div>
          <div
            aria-hidden="true"
            class={cn(
              "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
              playing() || current() > 0 ? "scale-100" : "scale-0 group-hover:scale-100 peer-focus-visible:scale-100",
            )}
            style={{ left: `${fraction(current()) * 100}%` }}
          />
        </div>
        <div class="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{formatDurationClock(current() * 1000)}</span>
          <span>{formatDurationClock(duration() == null ? null : duration()! * 1000)}</span>
        </div>
      </div>

      <div class="mt-1 flex flex-wrap items-center gap-1">
        <button type="button" class={ghostButton} aria-label={t("audio.back", { secs: SKIP_SECS })} onClick={() => skip(-SKIP_SECS)}>
          <IconSkipBack class="h-4 w-4" />
          <span aria-hidden="true">{SKIP_SECS}</span>
        </button>
        <button type="button" class={ghostButton} aria-label={t("audio.forward", { secs: SKIP_SECS })} onClick={() => skip(SKIP_SECS)}>
          <IconSkipForward class="h-4 w-4" />
          <span aria-hidden="true">{SKIP_SECS}</span>
        </button>
        <button
          type="button"
          class={cn(ghostButton, "min-w-12 tabular-nums", rate() !== 1 && "text-primary-text")}
          aria-label={t("audio.speed", { rate: rateLabel() })}
          onClick={cycleRate}
        >
          {rateLabel()}
        </button>

        <div class="ml-auto flex items-center gap-1">
          <button
            type="button"
            class={ghostButton}
            aria-label={muted() || volume() === 0 ? t("audio.unmute") : t("audio.mute")}
            aria-pressed={muted()}
            onClick={toggleMute}
          >
            {volumeIcon()}
          </button>
          <input
            type="range"
            class="hidden h-1 w-20 cursor-pointer accent-primary sm:block"
            min="0"
            max="1"
            step="0.05"
            value={muted() ? 0 : volume()}
            aria-label={t("audio.volume")}
            onInput={(event) => {
              setVolume(Number(event.currentTarget.value));
              setMuted(false);
            }}
          />
          {props.extra}
        </div>
      </div>

      <Show when={failed()}>
        <p role="alert" class="mt-2 text-xs text-destructive-text">
          {t("audio.loadFailed")}{" "}
          <button
            type="button"
            class="font-medium underline underline-offset-2"
            onClick={() => {
              setFailed(false);
              audio.load();
            }}
          >
            {t("common.tryAgain")}
          </button>
        </p>
      </Show>
    </div>
  );
}
