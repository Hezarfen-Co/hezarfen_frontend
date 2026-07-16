import type { Locale } from "@/i18n/messages";

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter: number | null;

  constructor(status: number, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

const API_PREFIX = "/api";

const API_ERROR_MESSAGES: Record<string, Record<Locale, string>> = {
  "request failed": {
    en: "Request failed.",
    tr: "İşlem tamamlanamadı.",
  },
  "unauthorized": {
    en: "Sign in to continue.",
    tr: "Devam etmek için giriş yap.",
  },
  "forbidden": {
    en: "You do not have permission for this action.",
    tr: "Bu işlem için yetkin yok.",
  },
  "not found": {
    en: "The requested record was not found.",
    tr: "İstenen kayıt bulunamadı.",
  },
  "invalid credentials": {
    en: "Username or password is incorrect.",
    tr: "Kullanıcı adı veya şifre hatalı.",
  },
  "username already exists": {
    en: "This username is already in use.",
    tr: "Bu kullanıcı adı zaten kullanılıyor.",
  },
  "course not found": {
    en: "Course not found.",
    tr: "Ders bulunamadı.",
  },
  "exam not found": {
    en: "Exam not found.",
    tr: "Sınav bulunamadı.",
  },
  "not enrolled in this exam's course": {
    en: "You are not enrolled in this exam's course.",
    tr: "Bu sınavın dersine kayıtlı değilsin.",
  },
  "you are not enrolled in this exam's course": {
    en: "You are not enrolled in this exam's course.",
    tr: "Bu sınavın dersine kayıtlı değilsin.",
  },
  "exam is not scheduled": {
    en: "This exam is not scheduled for online sitting.",
    tr: "Bu sınav çevrim içi oturum için zamanlanmamış.",
  },
  "attempt not found": {
    en: "Start the exam before opening the exam room.",
    tr: "Sınav odasını açmadan önce sınavı başlat.",
  },
  "attempt is closed": {
    en: "This attempt is closed. Answers are read-only.",
    tr: "Bu oturum kapalı. Cevaplar salt okunur.",
  },
  "only students can sit exams": {
    en: "Only students can take exams.",
    tr: "Sınava yalnızca öğrenciler girebilir.",
  },
  "user_id: only students can be enrolled in a course": {
    en: "Only students can be enrolled in a course.",
    tr: "Derse yalnızca öğrenciler kaydedilebilir.",
  },
  "user_id: only students can be graded": {
    en: "Only students can be graded.",
    tr: "Yalnızca öğrencilere not verilebilir.",
  },
  "user_id: only students can be marked present in a lesson": {
    en: "Only students can be marked on a lesson roll call.",
    tr: "Ders yoklamasında yalnızca öğrenciler işaretlenebilir.",
  },
};

function currentLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem("hezarfen.locale");
    if (saved === "en" || saved === "tr") return saved;
    return window.navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}

function normalizeApiMessage(message: string): string {
  return message
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .toLowerCase();
}

function sentenceCase(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toLocaleUpperCase("en-US") + trimmed.slice(1);
}

export async function client<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_PREFIX}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "same-origin",
    signal: options.signal,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : res.statusText || "Request failed";

    let retryAfter: number | null = null;
    if (res.status === 429) {
      const raw = res.headers.get("Retry-After");
      if (raw) {
        const n = Number(raw);
        retryAfter = Number.isFinite(n) ? n : null;
      }
    }

    throw new ApiError(res.status, message, retryAfter);
  }

  return data as T;
}

export async function formClient<T>(path: string, body: FormData, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    body,
    credentials: "same-origin",
    signal,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : res.statusText || "Request failed";
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export function formatApiErrorMessage(message: string, locale: Locale = currentLocale()): string {
  const normalized = normalizeApiMessage(message);
  const known = API_ERROR_MESSAGES[normalized]?.[locale];
  if (known) return known;
  if (locale === "tr") return "İşlem tamamlanamadı. Lütfen tekrar dene.";
  return sentenceCase(message);
}

export function formatApiError(err: unknown, locale: Locale = currentLocale()): string {
  if (err instanceof ApiError) {
    if (err.status === 429 && err.retryAfter != null) {
      return locale === "tr" ? `${err.retryAfter} sn sonra tekrar dene.` : `Try again in ${err.retryAfter}s.`;
    }
    if (err.status === 401) return API_ERROR_MESSAGES.unauthorized[locale];
    if (err.status === 403) return API_ERROR_MESSAGES.forbidden[locale];
    if (err.status === 404) return API_ERROR_MESSAGES["not found"][locale];
    if (err.status >= 500) return locale === "tr" ? "Sunucuda bir sorun oluştu. Lütfen tekrar dene." : "Server error. Please try again.";
    return formatApiErrorMessage(err.message, locale);
  }
  if (err instanceof Error) return formatApiErrorMessage(err.message, locale);
  return locale === "tr" ? "Bir şeyler ters gitti." : "Something went wrong.";
}
