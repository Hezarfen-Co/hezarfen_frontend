/**
 * unDraw illustrations (https://undraw.co — free for commercial use, no
 * attribution required; see src/assets/illustrations/README.md). The SVG files
 * stay exactly as downloaded; their fixed palette is mapped onto theme tokens
 * here, so they follow the picked brand color and the dark theme.
 */
export type IllustrationName =
  | "calendar-empty"
  | "charts"
  | "coming-soon"
  | "courses"
  | "empty"
  | "events"
  | "exams"
  | "homework"
  | "meals"
  | "modules"
  | "messages"
  | "no-results"
  | "notes"
  | "payments"
  | "people"
  | "schedule"
  | "server-down"
  | "whiteboard"
  | "work";

const loaders = import.meta.glob<string>("../assets/illustrations/*.svg", {
  query: "?raw",
  import: "default",
});

// unDraw's stock colors → the --illu-* tokens declared in index.css. Skin
// tones and the few food colors are left alone.
const PALETTE: Record<string, string> = {
  "#6c63ff": "var(--illu-accent)",
  "#ff6584": "var(--illu-accent-2)",
  "#fd6584": "var(--illu-accent-2)",
  "#3f3d56": "var(--illu-ink)",
  "#2f2e41": "var(--illu-ink)",
  "#090814": "var(--illu-ink)",
  "#ccc": "var(--illu-line)",
  "#cacaca": "var(--illu-line)",
  "#cbcbcb": "var(--illu-line)",
  "#d6d6e3": "var(--illu-line)",
  "#e6e6e6": "var(--illu-soft)",
  "#e4e4e4": "var(--illu-soft)",
  "#e2e2e2": "var(--illu-soft)",
  "#e6e7e8": "var(--illu-soft)",
  "#f0f0f0": "var(--illu-soft)",
  "#f2f2f2": "var(--illu-soft)",
  "#fff": "var(--illu-paper)",
  "#ffffff": "var(--illu-paper)",
};

export function recolorIllustration(svg: string): string {
  return svg
    .replace(/#[0-9a-f]{3,6}\b/gi, (hex) => PALETTE[hex.toLowerCase()] ?? hex)
    // Size comes from the wrapper's CSS, not the file's pixel dimensions.
    .replace(/<svg([^>]*?)\s(?:width|height)="[^"]*"/g, "<svg$1")
    .replace(/<svg([^>]*?)\s(?:width|height)="[^"]*"/g, "<svg$1")
    .replace(/<svg/, '<svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"');
}

const cache = new Map<IllustrationName, Promise<string>>();

export function loadIllustration(name: IllustrationName): Promise<string> {
  let pending = cache.get(name);
  if (!pending) {
    const load = loaders[`../assets/illustrations/${name}.svg`];
    pending = load ? load().then(recolorIllustration) : Promise.resolve("");
    cache.set(name, pending);
  }
  return pending;
}
