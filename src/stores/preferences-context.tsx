import {
  type Accessor,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { patchMyPreferences } from "@/api/users";
import type { User } from "@/api/client";
import { formatMessage, messages, type Locale, type MessageKey } from "@/i18n/messages";

export type ThemeMode = "light" | "dark";

type PreferencesContextValue = {
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
  theme: Accessor<ThemeMode>;
  setTheme: (theme: ThemeMode) => void;
  paletteColor: Accessor<string | null>;
  setPaletteColor: (color: string | null) => void;
  toggleTheme: () => void;
  hydratePreferences: (user: Pick<User, "theme" | "language" | "palette_color">) => void;
  sidebarCollapsed: Accessor<boolean>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue>();

const LOCALE_KEY = "hezarfen.locale";
const THEME_KEY = "hezarfen.theme";
const PALETTE_COLOR_KEY = "hezarfen.paletteColor";
const SIDEBAR_KEY = "hezarfen.sidebarCollapsed";
const HEX_COLOR = /^#[\da-f]{6}$/i;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // Preferences still work for this session when storage is blocked/full.
  }
}

function removeStorage(key: string) {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // Preferences still work for this session when storage is blocked.
  }
}

function readLocale(): Locale {
  const storage = getStorage();
  if (!storage) return "en";
  try {
    const saved = storage.getItem(LOCALE_KEY);
    if (saved === "en" || saved === "tr") return saved;
    return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}

function readTheme(): ThemeMode {
  const storage = getStorage();
  if (!storage) return "light";
  try {
    const saved = storage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readPaletteColor(): string | null {
  try {
    const saved = getStorage()?.getItem(PALETTE_COLOR_KEY);
    return saved && HEX_COLOR.test(saved) ? saved.toLowerCase() : null;
  } catch {
    return null;
  }
}

function hexToHslParts(hex: string): { h: number; s: number; l: number } {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: lightness * 100 };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === red
      ? 60 * (((green - blue) / delta) % 6)
      : max === green
        ? 60 * ((blue - red) / delta + 2)
        : 60 * ((red - green) / delta + 4);

  return { h: hue < 0 ? hue + 360 : hue, s: saturation * 100, l: lightness * 100 };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - chroma / 2;
  const [r1, g1, b1] =
    h < 60 ? [chroma, x, 0]
    : h < 120 ? [x, chroma, 0]
    : h < 180 ? [0, chroma, x]
    : h < 240 ? [0, x, chroma]
    : h < 300 ? [x, 0, chroma]
    : [chroma, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return channel(r) * 0.2126 + channel(g) * 0.7152 + channel(b) * 0.0722;
}

function foregroundFor(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return relativeLuminance(r, g, b) > 0.179 ? "210 10.8% 14.5%" : "210 16.7% 97.6%";
}

/**
 * A theme-appropriate variant of the user's chosen accent: the hue is kept,
 * saturation is clamped into a tasteful range, but lightness is pinned to a
 * value known to read well against that theme's background — the swatch's own
 * lightness is deliberately ignored. Without this, a pastel pick (e.g.
 * `#fefae0`) would be nearly invisible as a light-mode button, and a near-black
 * pick (e.g. `#023047`) would vanish against the near-black dark background.
 */
/** WCAG contrast ratio between two relative luminances. */
function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The darkest-needed step of the light-mode accent that still reads as the
 * accent but reaches 4.5:1 as small text on white and on the 97% page
 * background. A yellow or cyan pick at the button lightness does not.
 */
export function accentTextLightness(h: number, s: number, from: number): number {
  const page = relativeLuminance(...hslToRgb(0, 0, 97));
  for (let l = from; l > 10; l -= 1) {
    const text = relativeLuminance(...hslToRgb(h, s, l));
    if (contrastRatio(text, page) >= 4.5) return l;
  }
  return 10;
}

function themedAccent(hex: string, mode: ThemeMode): { hsl: string; fg: string } {
  const { h, s } = hexToHslParts(hex);
  const sat = Math.min(88, Math.max(30, s));
  const lightness = mode === "light" ? 40 : 68;
  return {
    hsl: `${Math.round(h)} ${Math.round(sat)}% ${lightness}%`,
    fg: foregroundFor(h, sat, lightness),
  };
}

function readSidebarCollapsed(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function PreferencesProvider(props: ParentProps) {
  const [locale, setLocaleSignal] = createSignal<Locale>(readLocale());
  const [theme, setThemeSignal] = createSignal<ThemeMode>(readTheme());
  const [paletteColor, setPaletteColorSignal] = createSignal<string | null>(readPaletteColor());
  const [sidebarCollapsed, setSidebarCollapsedSignal] = createSignal(readSidebarCollapsed());

  createEffect(() => {
    const l = locale();
    writeStorage(LOCALE_KEY, l);
    document.documentElement.lang = l;
  });

  createEffect(() => {
    const th = theme();
    writeStorage(THEME_KEY, th);
    document.documentElement.setAttribute("data-kb-theme", th);
    document.documentElement.classList.toggle("dark", th === "dark");
    // The boot script paints an inline background on <html> because it runs
    // before the stylesheet; from here on the stylesheet owns that color, and
    // a stale literal would survive a theme switch.
    document.documentElement.style.removeProperty("background-color");
    // The system bars (status bar, gesture bar) are painted by the shell from
    // this meta tag, not from the page, so without the update they keep the
    // boot value and a switched theme left a white strip framing a dark app.
    // The value is read back from --background so the two cannot drift apart.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      if (background) meta.content = `hsl(${background})`;
    }
  });

  createEffect(() => {
    const color = paletteColor();
    const root = document.documentElement.style;
    if (!color) {
      removeStorage(PALETTE_COLOR_KEY);
      root.removeProperty("--accent-light");
      root.removeProperty("--accent-light-fg");
      root.removeProperty("--accent-light-text");
      root.removeProperty("--accent-dark");
      root.removeProperty("--accent-dark-fg");
      return;
    }
    writeStorage(PALETTE_COLOR_KEY, color);
    // Both variants are always set, regardless of the active theme, so a live
    // light/dark toggle picks up the right one immediately via the CSS
    // `[data-kb-theme="dark"]` cascade — no need to recompute on theme change.
    const light = themedAccent(color, "light");
    const dark = themedAccent(color, "dark");
    root.setProperty("--accent-light", light.hsl);
    root.setProperty("--accent-light-fg", light.fg);
    {
      const { h, s } = hexToHslParts(color);
      const sat = Math.min(88, Math.max(30, s));
      root.setProperty("--accent-light-text", `${Math.round(h)} ${Math.round(sat)}% ${accentTextLightness(h, sat, 40)}%`);
    }
    root.setProperty("--accent-dark", dark.hsl);
    root.setProperty("--accent-dark-fg", dark.fg);
  });

  createEffect(() => {
    writeStorage(SIDEBAR_KEY, sidebarCollapsed() ? "1" : "0");
  });

  const persistPreferences = (body: Parameters<typeof patchMyPreferences>[0]) => {
    void patchMyPreferences(body).catch(() => undefined);
  };

  const setLocale = (l: Locale) => {
    setLocaleSignal(l);
    persistPreferences({ language: l });
  };
  const setTheme = (th: ThemeMode) => {
    setThemeSignal(th);
    persistPreferences({ theme: th });
  };
  const setPaletteColor = (color: string | null) => {
    const next = color && HEX_COLOR.test(color) ? color.toLowerCase() : null;
    setPaletteColorSignal(next);
    // Empty string clears the accent back to "never chose" on the backend; a
    // valid hex sets it. Mirrors the theme/language sync.
    persistPreferences({ palette_color: next ?? "" });
  };
  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
  };
  const hydratePreferences = (user: Pick<User, "theme" | "language" | "palette_color">) => {
    if (user.language === "en" || user.language === "tr") setLocaleSignal(user.language);
    if (user.theme === "light" || user.theme === "dark") setThemeSignal(user.theme);
    if (user.palette_color && HEX_COLOR.test(user.palette_color)) {
      setPaletteColorSignal(user.palette_color.toLowerCase());
    }
  };
  const setSidebarCollapsed = (v: boolean) => setSidebarCollapsedSignal(v);
  const toggleSidebar = () => setSidebarCollapsedSignal((v) => !v);

  const t = (key: MessageKey, vars?: Record<string, string | number>) => {
    const loc = locale();
    const text = messages[loc][key] ?? messages.en[key] ?? key;
    return formatMessage(text, vars);
  };

  return (
    <PreferencesContext.Provider
      value={{
        locale,
        setLocale,
        theme,
        setTheme,
        paletteColor,
        setPaletteColor,
        toggleTheme,
        hydratePreferences,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        t,
      }}
    >
      {props.children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

export function useT() {
  const { t, locale } = usePreferences();
  // Touch locale so callers re-render when language changes even if they
  // only hold a reference to `t` in some edge paths.
  void locale();
  return t;
}
