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
};

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

export function formatApiErrorMessage(message: string, locale: Locale = "en"): string {
  return API_ERROR_MESSAGES[normalizeApiMessage(message)]?.[locale] ?? sentenceCase(message);
}

export function formatApiError(err: unknown, locale: Locale = "en"): string {
  if (err instanceof ApiError) {
    if (err.status === 429 && err.retryAfter != null) {
      return locale === "tr" ? `${err.retryAfter} sn sonra tekrar dene.` : `Try again in ${err.retryAfter}s.`;
    }
    return formatApiErrorMessage(err.message, locale);
  }
  if (err instanceof Error) return formatApiErrorMessage(err.message, locale);
  return locale === "tr" ? "Bir şeyler ters gitti." : "Something went wrong.";
}
