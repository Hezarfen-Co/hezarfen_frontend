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

function hexToHsl(hex: string): string {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return `0 0% ${Math.round(lightness * 100)}%`;

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === red
      ? 60 * (((green - blue) / delta) % 6)
      : max === green
        ? 60 * ((blue - red) / delta + 2)
        : 60 * ((red - green) / delta + 4);

  return `${Math.round(hue < 0 ? hue + 360 : hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function paletteForeground(hex: string): string {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 0.179
    ? "210 10.8% 14.5%"
    : "210 16.7% 97.6%";
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
  });

  createEffect(() => {
    const color = paletteColor();
    if (!color) {
      removeStorage(PALETTE_COLOR_KEY);
      document.documentElement.style.removeProperty("--ui-accent");
      document.documentElement.style.removeProperty("--primary-foreground");
      return;
    }
    writeStorage(PALETTE_COLOR_KEY, color);
    document.documentElement.style.setProperty("--ui-accent", hexToHsl(color));
    document.documentElement.style.setProperty("--primary-foreground", paletteForeground(color));
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
