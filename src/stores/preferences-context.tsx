import {
  type Accessor,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { patchMyPreferences } from "@/api/patchMyPreferences";
import type { User } from "@/api/types";
import { formatMessage, messages, type Locale, type MessageKey } from "@/i18n/messages";

export type ThemeMode = "light" | "dark";

type PreferencesContextValue = {
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
  theme: Accessor<ThemeMode>;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hydratePreferences: (user: Pick<User, "theme" | "language">) => void;
  sidebarCollapsed: Accessor<boolean>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue>();

const LOCALE_KEY = "hezarfen.locale";
const THEME_KEY = "hezarfen.theme";
const SIDEBAR_KEY = "hezarfen.sidebarCollapsed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readLocale(): Locale {
  if (!canUseStorage()) return "en";
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "en" || saved === "tr") return saved;
    return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}

function readTheme(): ThemeMode {
  if (!canUseStorage()) return "light";
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readSidebarCollapsed(): boolean {
  if (!canUseStorage()) return false;
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function PreferencesProvider(props: ParentProps) {
  const [locale, setLocaleSignal] = createSignal<Locale>(readLocale());
  const [theme, setThemeSignal] = createSignal<ThemeMode>(readTheme());
  const [sidebarCollapsed, setSidebarCollapsedSignal] = createSignal(readSidebarCollapsed());

  createEffect(() => {
    const l = locale();
    if (!canUseStorage()) return;
    localStorage.setItem(LOCALE_KEY, l);
    document.documentElement.lang = l;
  });

  createEffect(() => {
    const th = theme();
    if (!canUseStorage()) return;
    localStorage.setItem(THEME_KEY, th);
    document.documentElement.setAttribute("data-kb-theme", th);
    document.documentElement.classList.toggle("dark", th === "dark");
  });

  createEffect(() => {
    if (!canUseStorage()) return;
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed() ? "1" : "0");
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
  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
  };
  const hydratePreferences = (user: Pick<User, "theme" | "language">) => {
    if (user.language === "en" || user.language === "tr") setLocaleSignal(user.language);
    if (user.theme === "light" || user.theme === "dark") setThemeSignal(user.theme);
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
