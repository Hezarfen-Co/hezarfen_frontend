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
  cache?: RequestCache;
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
  "file too large": {
    en: "This file is larger than the allowed upload limit.",
    tr: "Bu dosya izin verilen yükleme sınırından büyük.",
  },
  "payload too large": {
    en: "This upload is too large. Choose a smaller file and try again.",
    tr: "Bu yükleme çok büyük. Daha küçük bir dosya seçip tekrar dene.",
  },
  "request entity too large": {
    en: "This upload is too large. Choose a smaller file and try again.",
    tr: "Bu yükleme çok büyük. Daha küçük bir dosya seçip tekrar dene.",
  },
  "unsupported file type": {
    en: "This file type is not supported.",
    tr: "Bu dosya türü desteklenmiyor.",
  },
  "unsupported image type": {
    en: "This image type is not supported. Use PNG, JPEG, WebP, or GIF.",
    tr: "Bu görsel türü desteklenmiyor. PNG, JPEG, WebP veya GIF kullan.",
  },
  "invalid image": {
    en: "The image could not be read. Choose another image and try again.",
    tr: "Görsel okunamadı. Başka bir görsel seçip tekrar dene.",
  },
  "too many files": {
    en: "This note already has the maximum number of files.",
    tr: "Bu notta en fazla dosya sayısına ulaşılmış.",
  },
  "note file limit reached": {
    en: "This note already has the maximum number of files.",
    tr: "Bu notta en fazla dosya sayısına ulaşılmış.",
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
  "exam has not started": {
    en: "This exam has not started yet.",
    tr: "Bu sınav henüz başlamadı.",
  },
  "exam has ended": {
    en: "This exam has ended.",
    tr: "Bu sınav sona erdi.",
  },
  "no attempts left": {
    en: "No attempts left for this exam.",
    tr: "Bu sınav için deneme hakkı kalmadı.",
  },
  "answer is required": {
    en: "Enter an answer before saving.",
    tr: "Kaydetmeden önce cevap gir.",
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
  "event is full": {
    en: "This event is full.",
    tr: "Bu etkinlik dolu.",
  },
  "registration is closed": {
    en: "Registration is closed for this event.",
    tr: "Bu etkinlik için kayıt kapalı.",
  },
  "already registered": {
    en: "This student is already registered.",
    tr: "Bu öğrenci zaten kayıtlı.",
  },
  "already enrolled": {
    en: "This student is already enrolled.",
    tr: "Bu öğrenci zaten kayıtlı.",
  },
  "active pomodoro session already exists": {
    en: "You already have a focus session running.",
    tr: "Zaten devam eden bir odak oturumun var.",
  },
  "no active pomodoro session": {
    en: "There is no active focus session to finish.",
    tr: "Bitirilecek aktif odak oturumu yok.",
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

function errorMessageFromPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  const detail = record.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const row = item as Record<string, unknown>;
        const loc = Array.isArray(row.loc) ? row.loc.map(String).join(".") : "";
        const msg = typeof row.msg === "string" ? row.msg : "";
        return loc && msg ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join("; ") || fallback;
  }
  return fallback;
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
    cache: options.cache,
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
    const message = errorMessageFromPayload(data, res.statusText || "Request failed");

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
    const message = errorMessageFromPayload(data, res.statusText || "Request failed");
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export async function blobClient(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    credentials: "same-origin",
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText || "Request failed";
    if (text) {
      try {
        message = errorMessageFromPayload(JSON.parse(text), message);
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message);
  }

  return res.blob();
}

export function formatApiErrorMessage(message: string, locale: Locale = currentLocale()): string {
  const normalized = normalizeApiMessage(message);
  const known = API_ERROR_MESSAGES[normalized]?.[locale];
  if (known) return known;
  if (locale === "tr") return `İşlem tamamlanamadı: ${sentenceCase(message)}`;
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
    if (err.status === 409) return formatApiErrorMessage(err.message, locale);
    if (err.status === 413) return API_ERROR_MESSAGES["payload too large"][locale];
    if (err.status === 422) return formatApiErrorMessage(err.message, locale);
    if (err.status >= 500) return locale === "tr" ? "Sunucuda bir sorun oluştu. Lütfen tekrar dene." : "Server error. Please try again.";
    return formatApiErrorMessage(err.message, locale);
  }
  if (err instanceof Error) return formatApiErrorMessage(err.message, locale);
  return locale === "tr" ? "Bir şeyler ters gitti." : "Something went wrong.";
}
